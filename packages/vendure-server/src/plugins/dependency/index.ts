/**
 * Purpose: Barrel export for DependencyPlugin.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * Tests:
 *   - packages/vendure-server/src/plugins/dependency/dependency.plugin.test.ts
 */
export {
  DependencyPlugin,
  DependencyEntity,
  dependencyConfiguration,
  validateDependency,
  checkDependenciesMet,
  calculateDependencyDiscount,
  buildDependencyGraph,
  detectCircularDependencies,
} from './dependency.plugin.js';

export type {
  DependencyLike,
  DependencyCheckResult,
  DependencyGraph,
} from './dependency.plugin.js';
