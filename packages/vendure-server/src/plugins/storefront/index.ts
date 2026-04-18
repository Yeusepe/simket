/**
 * Purpose: Barrel export for the StorefrontPlugin package.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership, Storefront plugin)
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/storefront.plugin.test.ts
 */
export {
  StorefrontPlugin,
  storefrontConfiguration,
  validateStorePage,
  isPageVisibleToUser,
  sortPages,
  filterPagesByScope,
  duplicatePage,
} from './storefront.plugin.js';
export { StorePageEntity } from './storefront.entity.js';
export type { StorePageScope } from './storefront.entity.js';
