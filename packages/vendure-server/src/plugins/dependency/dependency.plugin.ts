/**
 * Purpose: DependencyPlugin — registers product prerequisite rules and exports
 * pure helpers for validation, dependency checks, discount calculation, graph
 * building, and cycle detection.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 * Tests:
 *   - packages/vendure-server/src/plugins/dependency/dependency.plugin.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import type { RuntimeVendureConfig } from '@vendure/core';
import { DependencyEntity } from './dependency.entity.js';

const MIN_DISCOUNT_PERCENT = 0;
const MAX_DISCOUNT_PERCENT = 100;

interface DependencyLike {
  productId?: string | null;
  requiredProductId?: string | null;
  discountPercent?: number | null;
  enabled?: boolean | null;
  message?: string | null;
}

interface DependencyCheckResult {
  met: boolean;
  missing: string[];
  discount: number;
}

interface CheckoutDependencyLine {
  productId: string;
  productName: string;
}

interface CheckoutDependencyRequirement extends DependencyLike {
  requiredProductName?: string | null;
  requiredProductSlug?: string | null;
  requiredVariantId?: string | null;
  requiredProductPrice?: number | null;
  currencyCode?: string | null;
}

interface CheckoutDependencyIssue {
  productId: string;
  productName: string;
  missingRequirements: CheckoutDependencyRequirement[];
  message: string;
}

interface CheckoutDependencyValidationResult {
  canCheckout: boolean;
  issues: CheckoutDependencyIssue[];
}

type DependencyGraph = Record<string, string[]>;

function isPresentString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDiscountPercent(value: number | null | undefined): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_DISCOUNT_PERCENT &&
    value <= MAX_DISCOUNT_PERCENT
  );
}

/**
 * Validates a dependency definition.
 */
function validateDependency(dep: DependencyLike): string[] {
  const errors: string[] = [];

  if (!isPresentString(dep.productId)) {
    errors.push('productId is required');
  }
  if (!isPresentString(dep.requiredProductId)) {
    errors.push('requiredProductId is required');
  }
  if (
    isPresentString(dep.productId) &&
    isPresentString(dep.requiredProductId) &&
    dep.productId === dep.requiredProductId
  ) {
    errors.push('productId and requiredProductId must be different');
  }

  const discountPercent = dep.discountPercent ?? 0;
  if (!isValidDiscountPercent(discountPercent)) {
    errors.push('discountPercent must be a finite number between 0 and 100');
  }

  return errors;
}

/**
 * Checks whether the customer's owned products satisfy all enabled dependencies.
 * When satisfied, the highest applicable dependency discount is returned.
 */
function checkDependenciesMet(
  dependencies: readonly DependencyLike[],
  ownedProductIds: readonly string[],
): DependencyCheckResult {
  const activeDependencies = dependencies.filter((dependency) => dependency.enabled !== false);

  if (activeDependencies.length === 0) {
    return {
      met: true,
      missing: [],
      discount: 0,
    };
  }

  const ownedProducts = new Set(ownedProductIds);
  const missing = activeDependencies
    .map((dependency) => dependency.requiredProductId)
    .filter((requiredProductId): requiredProductId is string => {
      return isPresentString(requiredProductId) && !ownedProducts.has(requiredProductId);
    });

  if (missing.length > 0) {
    return {
      met: false,
      missing,
      discount: 0,
    };
  }

  const discount = activeDependencies.reduce((highestDiscount, dependency) => {
    const dependencyDiscount = dependency.discountPercent ?? 0;
    return isValidDiscountPercent(dependencyDiscount)
      ? Math.max(highestDiscount, dependencyDiscount)
      : highestDiscount;
  }, 0);

  return {
    met: true,
    missing: [],
    discount,
  };
}

/**
 * Applies a dependency discount to a price in minor units.
 */
function calculateDependencyDiscount(originalPrice: number, discountPercent: number): number {
  return Math.round(originalPrice * (1 - discountPercent / 100));
}

/**
 * Validates whether all checkout lines have their prerequisite products either
 * already owned or present in the in-flight order.
 */
function validateCheckoutDependencies(
  lines: readonly CheckoutDependencyLine[],
  dependencies: readonly CheckoutDependencyRequirement[],
  ownedProductIds: readonly string[],
): CheckoutDependencyValidationResult {
  const availableProductIds = new Set([
    ...ownedProductIds,
    ...lines.map((line) => line.productId),
  ]);
  const dependencyGroups = dependencies.reduce<Record<string, CheckoutDependencyRequirement[]>>(
    (groups, dependency) => {
      if (!dependency.productId || dependency.enabled === false) {
        return groups;
      }

      const group = groups[dependency.productId] ?? [];
      group.push(dependency);
      groups[dependency.productId] = group;
      return groups;
    },
    {},
  );

  const issues = lines.flatMap((line) => {
    const lineDependencies = dependencyGroups[line.productId] ?? [];
    const missingRequirements = lineDependencies.filter((dependency) =>
      dependency.requiredProductId
      && !availableProductIds.has(dependency.requiredProductId),
    );

    if (missingRequirements.length === 0) {
      return [];
    }

    return [{
      productId: line.productId,
      productName: line.productName,
      missingRequirements,
      message:
        missingRequirements[0]?.message
        ?? `${line.productName} requires a prerequisite purchase before checkout.`,
    }];
  });

  return {
    canCheckout: issues.length === 0,
    issues,
  };
}

/**
 * Builds an adjacency map of enabled dependency edges.
 */
function buildDependencyGraph(dependencies: readonly DependencyLike[]): DependencyGraph {
  return dependencies.reduce<DependencyGraph>((graph, dependency) => {
    if (dependency.enabled === false) {
      return graph;
    }
    if (!isPresentString(dependency.productId) || !isPresentString(dependency.requiredProductId)) {
      return graph;
    }

    const productDependencies = (graph[dependency.productId] ??= []);
    productDependencies.push(dependency.requiredProductId);
    return graph;
  }, {});
}

function createCycleSignature(cycle: readonly string[]): string {
  const nodes = cycle.slice(0, -1);
  if (nodes.length === 0) {
    return '';
  }
  const rotations = nodes.map((_, index) => [...nodes.slice(index), ...nodes.slice(0, index)]);
  return (
    rotations
    .map((rotation) => [...rotation, rotation[0]].join('>'))
    .sort((left, right) => left.localeCompare(right))[0] ?? ''
  );
}

/**
 * Detects cycles in a dependency graph using depth-first search.
 */
function detectCircularDependencies(graph: DependencyGraph): string[][] {
  const visited = new Set<string>();
  const path: string[] = [];
  const cycles: string[][] = [];
  const seenCycles = new Set<string>();
  const nodes = new Set<string>([
    ...Object.keys(graph),
    ...Object.values(graph).flatMap((requiredProductIds) => requiredProductIds),
  ]);

  const visit = (node: string) => {
    visited.add(node);
    path.push(node);

    for (const next of graph[node] ?? []) {
      const cycleStartIndex = path.indexOf(next);
      if (cycleStartIndex >= 0) {
        const cycle = [...path.slice(cycleStartIndex), next];
        const signature = createCycleSignature(cycle);
        if (!seenCycles.has(signature)) {
          seenCycles.add(signature);
          cycles.push(cycle);
        }
        continue;
      }

      if (!visited.has(next)) {
        visit(next);
      }
    }

    path.pop();
  };

  for (const node of nodes) {
    if (!visited.has(node)) {
      visit(node);
    }
  }

  return cycles;
}

/**
 * Applies DependencyPlugin configuration to Vendure.
 */
function dependencyConfiguration(config: RuntimeVendureConfig): RuntimeVendureConfig {
  return config;
}

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [DependencyEntity],
  configuration: dependencyConfiguration,
  compatibility: '^3.0.0',
})
export class DependencyPlugin {}

export {
  DependencyEntity,
  MIN_DISCOUNT_PERCENT,
  MAX_DISCOUNT_PERCENT,
  dependencyConfiguration,
  validateDependency,
  checkDependenciesMet,
  calculateDependencyDiscount,
  validateCheckoutDependencies,
  buildDependencyGraph,
  detectCircularDependencies,
};

export type {
  DependencyLike,
  DependencyCheckResult,
  DependencyGraph,
  CheckoutDependencyLine,
  CheckoutDependencyRequirement,
  CheckoutDependencyIssue,
  CheckoutDependencyValidationResult,
};
