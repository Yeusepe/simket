/**
 * Purpose: Shared cart types for the storefront application.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 *   - docs/domain-model.md (Product entity — variants, pricing)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#orderline
 * Tests:
 *   - Type-only module; validated through hook and component tests
 */

/** A single item in the shopping cart. */
export interface CartItem {
  readonly productId: string;
  readonly variantId: string;
  readonly name: string;
  /** Price in minor units (cents). */
  readonly price: number;
  readonly currencyCode: string;
  readonly quantity: number;
  readonly heroImageUrl: string | null;
  readonly slug: string;
}

/** Cart state — derived totals are computed from items. */
export interface Cart {
  readonly items: readonly CartItem[];
  readonly totalItems: number;
  /** Subtotal in minor units (cents). */
  readonly subtotal: number;
  readonly currencyCode: string;
}
