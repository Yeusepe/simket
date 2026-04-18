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

export interface CartDependencyRequirement {
  readonly requiredProductId: string;
  readonly requiredVariantId: string;
  readonly requiredProductName: string;
  readonly requiredProductSlug: string;
  readonly requiredProductPrice: number;
  readonly currencyCode: string;
  readonly requiredProductHeroImageUrl: string | null;
  readonly discountPercent?: number;
  readonly message?: string;
}

export interface CartBundleReference {
  readonly bundleId: string;
  readonly instanceId: string;
  readonly name: string;
  readonly discountPercent: number;
}

/** A single persisted cart line. */
export interface CartItem {
  readonly lineId?: string;
  readonly productId: string;
  readonly variantId: string;
  readonly name: string;
  /** Original list price in minor units (cents). */
  readonly basePrice?: number;
  /** Stored line price before dependency discounts. */
  readonly price: number;
  readonly currencyCode: string;
  readonly quantity: number;
  readonly heroImageUrl: string | null;
  readonly slug: string;
  readonly bundle?: CartBundleReference;
  readonly dependencyRequirements?: readonly CartDependencyRequirement[];
}

export interface CartBundleInputProduct {
  readonly productId: string;
  readonly variantId: string;
  readonly name: string;
  readonly price: number;
  readonly currencyCode: string;
  readonly heroImageUrl: string | null;
  readonly slug: string;
  readonly dependencyRequirements?: readonly CartDependencyRequirement[];
}

export interface CartBundleInput {
  readonly bundleId: string;
  readonly name: string;
  readonly discountPercent: number;
  readonly products: readonly CartBundleInputProduct[];
}

export interface CartPricedItem extends CartItem {
  readonly lineId: string;
  readonly basePrice: number;
  readonly effectivePrice: number;
  readonly appliedDependencyDiscountPercent: number;
  readonly baseLineSubtotal: number;
  readonly lineSubtotal: number;
}

export interface CartBundleGroup {
  readonly bundleId: string;
  readonly instanceId: string;
  readonly name: string;
  readonly discountPercent: number;
  readonly items: readonly CartPricedItem[];
  readonly originalSubtotal: number;
  readonly bundleSubtotal: number;
  readonly subtotal: number;
  readonly bundleDiscountTotal: number;
  readonly dependencyDiscountTotal: number;
}

export interface CartDependencyIssue {
  readonly lineId: string;
  readonly productId: string;
  readonly productName: string;
  readonly message: string;
  readonly missingRequirements: readonly CartDependencyRequirement[];
}

export interface CartDependencyValidation {
  readonly canCheckout: boolean;
  readonly issues: readonly CartDependencyIssue[];
}

/** Cart state — derived totals are computed from items. */
export interface Cart {
  readonly items: readonly CartPricedItem[];
  readonly standaloneItems: readonly CartPricedItem[];
  readonly bundleGroups: readonly CartBundleGroup[];
  readonly totalItems: number;
  readonly subtotal: number;
  readonly baseSubtotal: number;
  readonly discountTotal: number;
  readonly bundleDiscountTotal: number;
  readonly dependencyDiscountTotal: number;
  readonly currencyCode: string;
  readonly dependencyValidation: CartDependencyValidation;
}
