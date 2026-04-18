/**
 * Purpose: Shared product types for the storefront application.
 * Governing docs:
 *   - docs/architecture.md (§4 Data Model)
 *   - docs/domain-model.md (Product entity)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#product
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#searchresult
 * Tests:
 *   - Type-only module; validated through component tests
 */

/** Product summary for listing cards — matches Vendure SearchResult shape. */
export interface ProductListItem {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  /** Price in minor units (cents). */
  readonly priceMin: number;
  /** Upper price bound for variants — same as priceMin for single-variant products. */
  readonly priceMax: number;
  readonly currencyCode: string;
  readonly heroImageUrl: string | null;
  readonly heroTransparentUrl: string | null;
  readonly creatorName: string;
  readonly tags: readonly string[];
  readonly categorySlug: string | null;
}

/** Paginated list response — matches Vendure PaginatedList shape. */
export interface PaginatedList<T> {
  readonly items: readonly T[];
  readonly totalItems: number;
}

/** Available sort fields for product listing. */
export type ProductSortField = 'createdAt' | 'price' | 'name';

/** Sort direction. */
export type SortDirection = 'ASC' | 'DESC';

/** Sort option combining field + direction. */
export interface ProductSortOption {
  readonly field: ProductSortField;
  readonly direction: SortDirection;
}

/** Active filter state for the product listing. */
export interface ProductFilters {
  readonly search?: string;
  readonly categorySlug?: string;
  readonly tags?: readonly string[];
  readonly priceMin?: number;
  readonly priceMax?: number;
}

/** Parameters for fetching a product listing page. */
export interface ProductListingParams {
  readonly page: number;
  readonly perPage: number;
  readonly sort: ProductSortOption;
  readonly filters: ProductFilters;
}

/** Facet count for filter sidebar. */
export interface FacetValue {
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

/** Facet group (e.g., "Category", "Tags"). */
export interface FacetGroup {
  readonly name: string;
  readonly values: readonly FacetValue[];
}

/** Full response from the product listing API. */
export interface ProductListingResponse {
  readonly products: PaginatedList<ProductListItem>;
  readonly facets: readonly FacetGroup[];
}

/** Default listing parameters. */
export const DEFAULT_PER_PAGE = 24;
export const DEFAULT_SORT: ProductSortOption = { field: 'createdAt', direction: 'DESC' };

/* ------------------------------------------------------------------ */
/*  Product Detail types                                               */
/* ------------------------------------------------------------------ */

/** Product variant — matches Vendure ProductVariant shape. */
export interface ProductVariant {
  readonly id: string;
  readonly name: string;
  /** Price in minor units (cents). */
  readonly price: number;
  readonly currencyCode: string;
  readonly sku: string;
  readonly stockLevel: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK';
}

/** Hero media type — determined by CDNgine transformation. */
export type HeroMediaType = 'image' | 'animated' | 'video';

export interface ProductBundleOffer {
  readonly bundleId: string;
  readonly name: string;
  readonly description?: string;
  readonly discountPercent: number;
  readonly callout: string;
  readonly products: readonly CartBundleInputProduct[];
}

/** Full product detail — matches Vendure Product + custom fields. */
export interface ProductDetail {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  /** TipTap JSONB — rendered read-only on detail page. */
  readonly tiptapDescription: unknown;
  /** Plain text fallback description. */
  readonly description: string;
  readonly variants: readonly ProductVariant[];
  readonly currencyCode: string;
  /** CDNgine hero media URL. */
  readonly heroMediaUrl: string | null;
  readonly heroMediaType: HeroMediaType;
  /** Optional transparent hero image for depth effect. */
  readonly heroTransparentUrl: string | null;
  /** Optional background for the transparent hero. */
  readonly heroBackgroundUrl: string | null;
  /** TipTap JSONB for Terms of Service. */
  readonly termsOfService: unknown;
  readonly tags: readonly string[];
  readonly categorySlug: string | null;
  /** Creator info. */
  readonly creator: {
    readonly id: string;
    readonly name: string;
    readonly avatarUrl: string | null;
  };
  /** Product IDs required before purchase (dependency check). */
  readonly requiredProductIds: readonly string[];
  readonly dependencyRequirements: readonly CartDependencyRequirement[];
  readonly availableBundles: readonly ProductBundleOffer[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
import type {
  CartBundleInputProduct,
  CartDependencyRequirement,
} from './cart';
