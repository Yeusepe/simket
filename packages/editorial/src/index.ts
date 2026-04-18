/**
 * Purpose: Barrel exports for the Simket editorial PayloadCMS package.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://payloadcms.com/docs
 * Tests:
 *   - packages/editorial/tests/articles.test.ts
 *   - packages/editorial/tests/featured-products.test.ts
 */

export { EditorialClient } from './client.js';
export { articlesCollection } from './collections/articles.js';
export { editorialSectionsCollection } from './collections/editorial-sections.js';
export { featuredProductsCollection } from './collections/featured-products.js';
export { mediaCollection } from './collections/media.js';
export {
  isArticle,
  isEditorialSection,
  isFeaturedProduct,
  isMediaAsset,
  parseDocumentResponse,
  parsePaginatedCollectionResponse,
} from './guards.js';
export { createAutoSlugField, generateEditorialSlug } from './slug.js';
export type {
  Article,
  ArticleStatus,
  EditorialLayout,
  EditorialSection,
  FeaturedProduct,
  MediaAsset,
  PaginatedCollectionResponse,
} from './types.js';
