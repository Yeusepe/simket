/**
 * Purpose: Re-export the Qdrant vector search types and service surface.
 *
 * Governing docs:
 *   - docs/service-architecture.md (§1.9 Qdrant)
 * External references:
 *   - https://qdrant.tech/documentation/
 * Tests:
 *   - packages/recommend-service/src/qdrant/qdrant.service.test.ts
 */

export type {
  FilterCondition,
  ProductVector,
  QdrantConfig,
  QdrantFilter,
  SearchOptions,
  SimilarityResult,
} from './qdrant.types.js';
export {
  buildQdrantFilter,
  cosineSimilarity,
  createDefaultSearchOptions,
  normalizeVector,
  QdrantService,
  validateProductVector,
  validateQdrantConfig,
  validateSearchOptions,
} from './qdrant.service.js';
export type {
  QdrantClientLike,
  QdrantServiceOptions,
  ResiliencePolicy,
} from './qdrant.service.js';
