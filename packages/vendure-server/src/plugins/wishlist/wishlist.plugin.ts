/**
 * Purpose: Register wishlist persistence and shop API extensions for saved products.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/domain-model.md (§1 core records)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/wishlist/wishlist.service.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { wishlistShopApiExtensions, WishlistResolver } from './wishlist.api.js';
import { WishlistItem } from './wishlist.entity.js';
import { WishlistService } from './wishlist.service.js';

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [WishlistItem],
  providers: [WishlistService],
  shopApiExtensions: {
    schema: wishlistShopApiExtensions,
    resolvers: [WishlistResolver],
  },
  compatibility: '^3.0.0',
})
export class WishlistPlugin {}
