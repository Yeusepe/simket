/**
 * Purpose: Shared storefront-facing TypeScript models for PayloadCMS editorial
 * content.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 * External references:
 *   - https://payloadcms.com/docs
 * Tests:
 *   - packages/editorial/tests/articles.test.ts
 *   - packages/editorial/tests/featured-products.test.ts
 */

export type ArticleStatus = 'draft' | 'published' | 'archived';

export type EditorialLayout =
  | 'hero-banner'
  | 'card-grid-4'
  | 'card-grid-2'
  | 'horizontal-scroll';

export interface MediaAsset {
  readonly id: string;
  readonly url: string;
  readonly filename: string;
  readonly alt?: string;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

export interface EditorialSection {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string;
  readonly layout: EditorialLayout;
  readonly sortOrder: number;
  readonly isActive: boolean;
}

export interface FeaturedProduct {
  readonly id: string;
  readonly productId: string;
  readonly displayTitle?: string;
  readonly displayDescription?: string;
  readonly heroImage?: MediaAsset;
  readonly heroTransparent?: MediaAsset;
  readonly priority: number;
  readonly startDate?: string;
  readonly endDate?: string;
}

export interface Article {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly excerpt: string;
  readonly content: unknown;
  readonly heroImage: MediaAsset;
  readonly heroTransparent?: MediaAsset;
  readonly author: string;
  readonly publishedAt: string;
  readonly status: ArticleStatus;
  readonly tags: readonly string[];
  readonly featuredProducts: readonly FeaturedProduct[];
  readonly section?: EditorialSection;
  /** Bento hero eyebrow; overrides section name when set (Payload: `spotlightEyebrow`). */
  readonly spotlightEyebrow?: string;
  /** Optional line below the bento hero title (Payload: `spotlightSubline`). */
  readonly spotlightSubline?: string;
  /** Formatted price for CTA pill, e.g. `€35.00+` (Payload: `spotlightPriceFormatted`). */
  readonly spotlightPriceFormatted?: string;
  /** When true, CTA shows “Read more” instead of `spotlightPriceFormatted`. */
  readonly hideSpotlightPrice?: boolean;
  /** When true, the CTA pill is hidden. */
  readonly hideSpotlightCta?: boolean;
  /** Product line in bento footer (Payload: `productName`). */
  readonly productName?: string;
  /** Creator line in bento footer (Payload: `creatorName`). */
  readonly creatorName?: string;
  /** Square product thumb in bento footer. */
  readonly productThumbnail?: MediaAsset;
}

export interface PaginatedCollectionResponse<T> {
  readonly docs: readonly T[];
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
  readonly limit: number;
  readonly nextPage?: number | null;
  readonly page?: number;
  readonly pagingCounter: number;
  readonly prevPage?: number | null;
  readonly totalDocs: number;
  readonly totalPages: number;
}
