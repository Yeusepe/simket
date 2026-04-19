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
import {
  dependencyAdminApiExtensions,
  dependencyShopApiExtensions,
  DependencyAdminResolver,
  DependencyShopResolver,
} from './dependency.api.js';
import { DependencyEntity } from './dependency.entity.js';
import { DependencyService } from './dependency.service.js';

/**
 * Applies DependencyPlugin configuration to Vendure.
 */
function dependencyConfiguration(config: RuntimeVendureConfig): RuntimeVendureConfig {
  return config;
}

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [DependencyEntity],
  providers: [DependencyService],
  adminApiExtensions: {
    schema: dependencyAdminApiExtensions,
    resolvers: [DependencyAdminResolver],
  },
  shopApiExtensions: {
    schema: dependencyShopApiExtensions,
    resolvers: [DependencyShopResolver],
  },
  configuration: dependencyConfiguration,
  compatibility: '^3.0.0',
})
export class DependencyPlugin {}

export { DependencyEntity, dependencyConfiguration };
export {
  buildDependencyGraph,
  calculateDependencyDiscount,
  checkDependenciesMet,
  detectCircularDependencies,
  MAX_DISCOUNT_PERCENT,
  MIN_DISCOUNT_PERCENT,
  validateCheckoutDependencies,
  validateDependency,
} from './dependency.service.js';
export type {
  CheckoutDependencyIssue,
  CheckoutDependencyLine,
  CheckoutDependencyRequirement,
  CheckoutDependencyValidationResult,
  DependencyCheckResult,
  DependencyGraph,
  DependencyLike,
} from './dependency.service.js';
