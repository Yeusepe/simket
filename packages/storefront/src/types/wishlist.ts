/**
 * Purpose: Shared storefront wishlist API contracts and hydrated item types.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 *   - docs/domain-model.md (§1 core records)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/storefront/src/hooks/useWishlist.test.tsx
 *   - packages/storefront/src/components/wishlist/WishlistButton.test.tsx
 *   - packages/storefront/src/components/wishlist/WishlistPage.test.tsx
 */
import type { ProductListItem } from './product';

export interface WishlistItem {
  readonly id: string;
  readonly customerId: string;
  readonly productId: string;
  readonly addedAt: string;
  readonly notifyOnPriceDrop: boolean;
  readonly product: ProductListItem;
}

export interface WishlistPage {
  readonly items: readonly WishlistItem[];
  readonly totalItems: number;
  readonly page: number;
  readonly limit: number;
}

export interface WishlistApi {
  listWishlist(request: { readonly page: number; readonly limit: number }): Promise<WishlistPage>;
  getWishlistCount(): Promise<number>;
  isInWishlist(productId: string): Promise<boolean>;
  addToWishlist(input: {
    readonly productId: string;
    readonly notifyOnPriceDrop: boolean;
  }): Promise<WishlistItem>;
  removeFromWishlist(productId: string): Promise<boolean>;
}
