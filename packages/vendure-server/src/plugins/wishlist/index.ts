/**
 * Purpose: Barrel export for the WishlistPlugin package.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§5 service ownership)
 * Tests:
 *   - packages/vendure-server/src/plugins/wishlist/wishlist.service.test.ts
 */
export { WishlistPlugin } from './wishlist.plugin.js';
export { WishlistItem } from './wishlist.entity.js';
export {
  WishlistService,
  type WishlistListItem,
  type WishlistPage,
  type WishlistPageOptions,
  type WishlistProductSummary,
} from './wishlist.service.js';
