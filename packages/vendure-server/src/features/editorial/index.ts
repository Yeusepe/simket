/**
 * Purpose: Editorial feature barrel for cached PayloadCMS reads, webhook
 * handlers, update sync, and storefront refresh contracts.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md (§1.5 PayloadCMS API)
 * Tests:
 *   - packages/vendure-server/src/features/editorial/editorial-cache.service.test.ts
 *   - packages/vendure-server/src/features/editorial/editorial-sync.service.test.ts
 *   - packages/vendure-server/src/features/editorial/editorial-webhook.router.test.ts
 */
export { EditorialCacheService } from './editorial-cache.service.js';
export {
  EDITORIAL_ARTICLES_COLLECTION,
  EDITORIAL_ARTICLES_SCHEMA,
  TypesenseEditorialArticleIndexer,
} from './editorial-search-indexer.js';
export type { EditorialArticleIndexer } from './editorial-search-indexer.js';
export {
  buildEditorialArticleSearchDocument,
  EditorialSyncService,
} from './editorial-sync.service.js';
export {
  createEditorialRouteHandlers,
  editorialWebhookJsonVerifier,
  mountEditorialRoutes,
  verifyEditorialWebhookSignature,
} from './editorial-webhook.router.js';
export type {
  CuratedCollection,
  CuratedCollectionItem,
  EditorialArticleSearchDocument,
  EditorialCollectionSlug,
  EditorialInvalidationResult,
  EditorialUpdate,
  EditorialUpdateStatus,
  EditorialWebhookDocument,
  EditorialWebhookEvent,
  EditorialWebhookOperation,
} from './editorial.types.js';
