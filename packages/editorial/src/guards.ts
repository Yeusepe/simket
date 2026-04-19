/**
 * Purpose: Validate PayloadCMS REST responses before exposing editorial content
 * to the storefront.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://payloadcms.com/docs
 *   - https://github.com/payloadcms/payload
 * Tests:
 *   - packages/editorial/tests/articles.test.ts
 *   - packages/editorial/tests/featured-products.test.ts
 */

import type {
  Article,
  ArticleStatus,
  EditorialLayout,
  EditorialSection,
  FeaturedProduct,
  MediaAsset,
  PaginatedCollectionResponse,
} from './types.js';

type Guard<T> = (value: unknown) => value is T;
type UnknownRecord = Record<string, unknown>;

const ARTICLE_STATUSES: readonly ArticleStatus[] = ['draft', 'published', 'archived'] as const;
const EDITORIAL_LAYOUTS: readonly EditorialLayout[] = [
  'hero-banner',
  'card-grid-4',
  'card-grid-2',
  'horizontal-scroll',
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean';
}

function isOptionalMediaAsset(value: unknown): value is MediaAsset | undefined {
  return value === undefined || isMediaAsset(value);
}

function isStatus(value: unknown): value is ArticleStatus {
  return typeof value === 'string' && ARTICLE_STATUSES.includes(value as ArticleStatus);
}

function isLayout(value: unknown): value is EditorialLayout {
  return typeof value === 'string' && EDITORIAL_LAYOUTS.includes(value as EditorialLayout);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isOptionalIsoDate(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

export function isMediaAsset(value: unknown): value is MediaAsset {
  if (!isRecord(value)) {
    return false;
  }

  return isString(value.id) && isString(value.url) && isString(value.filename) && isOptionalString(value.alt);
}

export function isEditorialSection(value: unknown): value is EditorialSection {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.slug) &&
    isOptionalString(value.description) &&
    isLayout(value.layout) &&
    typeof value.sortOrder === 'number' &&
    Number.isFinite(value.sortOrder) &&
    typeof value.isActive === 'boolean'
  );
}

export function isFeaturedProduct(value: unknown): value is FeaturedProduct {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.productId) &&
    isOptionalString(value.displayTitle) &&
    isOptionalString(value.displayDescription) &&
    isOptionalMediaAsset(value.heroImage) &&
    isOptionalMediaAsset(value.heroTransparent) &&
    typeof value.priority === 'number' &&
    Number.isFinite(value.priority) &&
    value.priority >= 1 &&
    value.priority <= 100 &&
    isOptionalIsoDate(value.startDate) &&
    isOptionalIsoDate(value.endDate)
  );
}

export function isArticle(value: unknown): value is Article {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.title) &&
    isString(value.slug) &&
    typeof value.excerpt === 'string' &&
    value.content !== undefined &&
    isMediaAsset(value.heroImage) &&
    isOptionalMediaAsset(value.heroTransparent) &&
    isString(value.author) &&
    isString(value.publishedAt) &&
    isStatus(value.status) &&
    isStringArray(value.tags) &&
    Array.isArray(value.featuredProducts) &&
    value.featuredProducts.every((entry) => isFeaturedProduct(entry)) &&
    (value.section === undefined || isEditorialSection(value.section)) &&
    (value.spotlightEyebrow === undefined || typeof value.spotlightEyebrow === 'string') &&
    (value.spotlightSubline === undefined || typeof value.spotlightSubline === 'string') &&
    (value.spotlightPriceFormatted === undefined || typeof value.spotlightPriceFormatted === 'string') &&
    isOptionalBoolean(value.hideSpotlightPrice) &&
    isOptionalBoolean(value.hideSpotlightCta) &&
    (value.productName === undefined || typeof value.productName === 'string') &&
    (value.creatorName === undefined || typeof value.creatorName === 'string') &&
    isOptionalMediaAsset(value.productThumbnail)
  );
}

export function parseDocumentResponse<T>(
  value: unknown,
  guard: Guard<T>,
  collectionName: string,
): T {
  if (!guard(value)) {
    throw new Error(`Invalid ${collectionName} response.`);
  }

  return value;
}

export function parsePaginatedCollectionResponse<T>(
  value: unknown,
  guard: Guard<T>,
  collectionName: string,
): PaginatedCollectionResponse<T> {
  if (!isRecord(value) || !Array.isArray(value.docs) || !value.docs.every((entry) => guard(entry))) {
    throw new Error(`Invalid ${collectionName} response.`);
  }

  if (
    typeof value.hasNextPage !== 'boolean' ||
    typeof value.hasPrevPage !== 'boolean' ||
    typeof value.limit !== 'number' ||
    typeof value.pagingCounter !== 'number' ||
    typeof value.totalDocs !== 'number' ||
    typeof value.totalPages !== 'number'
  ) {
    throw new Error(`Invalid ${collectionName} response.`);
  }

  return value as unknown as PaginatedCollectionResponse<T>;
}
