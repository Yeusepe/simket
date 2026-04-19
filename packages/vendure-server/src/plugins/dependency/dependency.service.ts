/**
 * Purpose: Persist product dependency rules and expose dependency evaluation for GraphQL resolvers.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/domain-model.md (§4.3 ProductDependency)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/service/services/customer.service.d.ts
 *   - packages/vendure-server/node_modules/@vendure/core/dist/service/services/product.service.d.ts
 *   - packages/vendure-server/node_modules/@vendure/core/dist/entity/order/order.entity.d.ts
 *   - packages/vendure-server/node_modules/typeorm/repository/Repository.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/dependency/dependency.plugin.test.ts
 *   - packages/vendure-server/src/plugins/dependency/dependency.resolver.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  CustomerService,
  ProductService,
  type RequestContext,
  type TransactionalConnection,
} from '@vendure/core';
import { Order } from '@vendure/core';
import { DependencyEntity } from './dependency.entity.js';

const tracer = trace.getTracer('simket-dependency');

export const MIN_DISCOUNT_PERCENT = 0;
export const MAX_DISCOUNT_PERCENT = 100;

export interface DependencyLike {
  readonly productId?: string | null;
  readonly requiredProductId?: string | null;
  readonly discountPercent?: number | null;
  readonly enabled?: boolean | null;
  readonly message?: string | null;
}

export interface DependencyCheckResult {
  readonly met: boolean;
  readonly missing: readonly string[];
  readonly discount: number;
}

export interface CheckoutDependencyLine {
  readonly productId: string;
  readonly productName: string;
}

export interface CheckoutDependencyRequirement extends DependencyLike {
  readonly requiredProductName?: string | null;
  readonly requiredProductSlug?: string | null;
  readonly requiredVariantId?: string | null;
  readonly requiredProductPrice?: number | null;
  readonly currencyCode?: string | null;
}

export interface CheckoutDependencyIssue {
  readonly productId: string;
  readonly productName: string;
  readonly missingRequirements: readonly CheckoutDependencyRequirement[];
  readonly message: string;
}

export interface CheckoutDependencyValidationResult {
  readonly canCheckout: boolean;
  readonly issues: readonly CheckoutDependencyIssue[];
}

export type DependencyGraph = Record<string, string[]>;

export interface DependencyRecord {
  readonly id: string;
  readonly productId: string;
  readonly requiredProductId: string;
  readonly discountPercent: number;
  readonly enabled: boolean;
  readonly message: string | null;
  readonly requiredProductName: string | null;
  readonly requiredProductSlug: string | null;
  readonly owned: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AddDependencyInput {
  readonly productId: string;
  readonly requiredProductId: string;
  readonly discountPercent?: number | null;
  readonly enabled?: boolean | null;
  readonly message?: string | null;
}

interface DependencyRepository {
  create(input: Partial<DependencyEntity>): DependencyEntity;
  save(entity: DependencyEntity): Promise<DependencyEntity>;
  find(options?: {
    readonly where?: Partial<DependencyEntity>;
    readonly order?: {
      readonly createdAt?: 'ASC' | 'DESC';
    };
  }): Promise<DependencyEntity[]>;
  findOneBy(where: Partial<DependencyEntity>): Promise<DependencyEntity | null>;
  remove(entity: DependencyEntity): Promise<DependencyEntity>;
}

interface OrderRepository {
  find(options?: {
    readonly where?: Partial<Order>;
    readonly relations?: {
      readonly lines?: {
        readonly productVariant?: boolean;
      };
    };
  }): Promise<Order[]>;
}

function isPresentString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDiscountPercent(value: number | null | undefined): value is number {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
    && value >= MIN_DISCOUNT_PERCENT
    && value <= MAX_DISCOUNT_PERCENT
  );
}

/**
 * Validates a dependency definition.
 */
export function validateDependency(dep: DependencyLike): string[] {
  const errors: string[] = [];

  if (!isPresentString(dep.productId)) {
    errors.push('productId is required');
  }
  if (!isPresentString(dep.requiredProductId)) {
    errors.push('requiredProductId is required');
  }
  if (
    isPresentString(dep.productId)
    && isPresentString(dep.requiredProductId)
    && dep.productId === dep.requiredProductId
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
export function checkDependenciesMet(
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
export function calculateDependencyDiscount(originalPrice: number, discountPercent: number): number {
  return Math.round(originalPrice * (1 - discountPercent / 100));
}

/**
 * Validates whether all checkout lines have their prerequisite products either
 * already owned or present in the in-flight order.
 */
export function validateCheckoutDependencies(
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
    } satisfies CheckoutDependencyIssue];
  });

  return {
    canCheckout: issues.length === 0,
    issues,
  };
}

/**
 * Builds an adjacency map of enabled dependency edges.
 */
export function buildDependencyGraph(dependencies: readonly DependencyLike[]): DependencyGraph {
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
export function detectCircularDependencies(graph: DependencyGraph): string[][] {
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

@Injectable()
export class DependencyService {
  constructor(
    private readonly connection: Pick<TransactionalConnection, 'getRepository'>,
    private readonly productService: ProductService,
    private readonly customerService: CustomerService,
  ) {}

  async addDependency(input: AddDependencyInput, ctx: RequestContext): Promise<DependencyRecord> {
    return tracer.startActiveSpan('dependency.add', async (span) => {
      try {
        const candidate = normalizeDependencyInput(input);
        await this.requireProducts(ctx, [candidate.productId, candidate.requiredProductId]);
        await this.assertNoCircularDependency(candidate, ctx);

        const repository = this.getDependencyRepository(ctx);
        const existing = await repository.findOneBy({
          productId: candidate.productId,
          requiredProductId: candidate.requiredProductId,
        });

        const entity = existing
          ? Object.assign(existing, candidate)
          : repository.create(candidate);
        return await this.mapDependency(await repository.save(entity), ctx, false);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async removeDependency(
    productId: string,
    requiredProductId: string,
    ctx: RequestContext,
  ): Promise<boolean> {
    return tracer.startActiveSpan('dependency.remove', async (span) => {
      try {
        const repository = this.getDependencyRepository(ctx);
        const entity = await repository.findOneBy({
          productId: normalizeEntityId(productId, 'productId'),
          requiredProductId: normalizeEntityId(requiredProductId, 'requiredProductId'),
        });

        if (!entity) {
          return false;
        }

        await repository.remove(entity);
        return true;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getProductDependencies(productId: string, ctx: RequestContext): Promise<DependencyRecord[]> {
    return this.loadDependencyRecords(productId, ctx, undefined);
  }

  async getProductRequirements(
    productId: string,
    activeUserId: string,
    ctx: RequestContext,
  ): Promise<DependencyRecord[]> {
    return this.loadDependencyRecords(productId, ctx, activeUserId);
  }

  async checkDependenciesForProduct(
    productId: string,
    activeUserId: string,
    ctx: RequestContext,
  ): Promise<DependencyCheckResult> {
    const dependencies = await this.getDependencyRepository(ctx).find({
      where: { productId: normalizeEntityId(productId, 'productId') },
      order: { createdAt: 'ASC' },
    });
    const ownedProductIds = await this.getOwnedProductIds(activeUserId, ctx);
    return checkDependenciesMet(dependencies, ownedProductIds);
  }

  private getDependencyRepository(ctx: RequestContext): DependencyRepository {
    return this.connection.getRepository(ctx, DependencyEntity) as unknown as DependencyRepository;
  }

  private getOrderRepository(ctx: RequestContext): OrderRepository {
    return this.connection.getRepository(ctx, Order) as unknown as OrderRepository;
  }

  private async loadDependencyRecords(
    productId: string,
    ctx: RequestContext,
    activeUserId: string | undefined,
  ): Promise<DependencyRecord[]> {
    const normalizedProductId = normalizeEntityId(productId, 'productId');
    const dependencies = await this.getDependencyRepository(ctx).find({
      where: { productId: normalizedProductId },
      order: { createdAt: 'ASC' },
    });
    const productDetails = await this.loadProductDetails(
      ctx,
      dependencies.map((dependency) => dependency.requiredProductId),
    );
    const ownedProductIds = activeUserId ? new Set(await this.getOwnedProductIds(activeUserId, ctx)) : new Set<string>();

    return dependencies.map((dependency) => {
      const requiredProduct = productDetails.get(String(dependency.requiredProductId));
      return {
        id: String(dependency.id),
        productId: String(dependency.productId),
        requiredProductId: String(dependency.requiredProductId),
        discountPercent: dependency.discountPercent,
        enabled: dependency.enabled,
        message: dependency.message,
        requiredProductName: requiredProduct?.name ?? null,
        requiredProductSlug: requiredProduct?.slug ?? null,
        owned: ownedProductIds.has(String(dependency.requiredProductId)),
        createdAt: dependency.createdAt,
        updatedAt: dependency.updatedAt,
      } satisfies DependencyRecord;
    });
  }

  private async loadProductDetails(ctx: RequestContext, productIds: readonly string[]) {
    const normalized = [...new Set(productIds.map((productId) => productId.trim()).filter(Boolean))];
    if (normalized.length === 0) {
      return new Map<string, { name: string; slug: string }>();
    }

    const products = await this.productService.findByIds(ctx, normalized);
    return new Map(
      products.map((product) => [
        String(product.id),
        {
          name: String(product.name),
          slug: String(product.slug),
        },
      ]),
    );
  }

  private async requireProducts(ctx: RequestContext, productIds: readonly string[]): Promise<void> {
    const normalized = [...new Set(productIds.map((productId) => normalizeEntityId(productId, 'productId')))];
    const products = await this.productService.findByIds(ctx, normalized);
    const found = new Set(products.map((product) => String(product.id)));
    const missing = normalized.filter((productId) => !found.has(productId));

    if (missing.length > 0) {
      throw new Error(`Dependency products not found: ${missing.join(', ')}.`);
    }
  }

  private async getOwnedProductIds(activeUserId: string, ctx: RequestContext): Promise<string[]> {
    const normalizedUserId = normalizeEntityId(activeUserId, 'activeUserId');
    const customer = await this.customerService.findOneByUserId(ctx, normalizedUserId, true);

    if (!customer) {
      return [];
    }

    const orders = await this.getOrderRepository(ctx).find({
      where: {
        customerId: customer.id,
        active: false,
      },
      relations: {
        lines: {
          productVariant: true,
        },
      },
    });

    return [
      ...new Set(
        orders.flatMap((order) =>
          order.lines
            .map((line) => line.productVariant)
            .filter((variant): variant is NonNullable<typeof variant> => Boolean(variant))
            .map((variant) => String(variant.productId))),
      ),
    ];
  }

  private async assertNoCircularDependency(
    candidate: Required<Pick<DependencyEntity, 'productId' | 'requiredProductId' | 'discountPercent' | 'enabled' | 'message'>>,
    ctx: RequestContext,
  ): Promise<void> {
    const dependencies = await this.getDependencyRepository(ctx).find();
    const graph = buildDependencyGraph([
      ...dependencies.filter(
        (dependency) =>
          String(dependency.productId) !== candidate.productId
          || String(dependency.requiredProductId) !== candidate.requiredProductId,
      ),
      candidate,
    ]);
    const cycles = detectCircularDependencies(graph);

    if (cycles.length > 0) {
      throw new Error(`Dependency graph contains a cycle: ${cycles[0]?.join(' -> ') ?? 'unknown cycle'}.`);
    }
  }

  private async mapDependency(
    dependency: DependencyEntity,
    ctx: RequestContext,
    owned: boolean,
  ): Promise<DependencyRecord> {
    const products = await this.loadProductDetails(ctx, [dependency.requiredProductId]);
    const requiredProduct = products.get(String(dependency.requiredProductId));

    return {
      id: String(dependency.id),
      productId: String(dependency.productId),
      requiredProductId: String(dependency.requiredProductId),
      discountPercent: dependency.discountPercent,
      enabled: dependency.enabled,
      message: dependency.message,
      requiredProductName: requiredProduct?.name ?? null,
      requiredProductSlug: requiredProduct?.slug ?? null,
      owned,
      createdAt: dependency.createdAt,
      updatedAt: dependency.updatedAt,
    };
  }
}

function normalizeEntityId(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`Dependency ${fieldName} is required.`);
  }
  return normalized;
}

function normalizeOptionalMessage(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDependencyInput(input: AddDependencyInput) {
  const candidate = {
    productId: normalizeEntityId(input.productId, 'productId'),
    requiredProductId: normalizeEntityId(input.requiredProductId, 'requiredProductId'),
    discountPercent: input.discountPercent ?? 0,
    enabled: input.enabled ?? true,
    message: normalizeOptionalMessage(input.message),
  };

  const errors = validateDependency(candidate);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return candidate;
}
