/**
 * Purpose: Encore-based recommendation service with pluggable backends.
 *
 * Governing docs:
 *   - docs/architecture.md (§8 Recommender system, pluggable interfaces)
 *   - docs/service-architecture.md (recommendation service)
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 *   - https://github.com/spotify/voyager (potential backend)
 *   - https://qdrant.tech/documentation/ (potential backend)
 * Tests:
 *   - packages/recommend-service/src/recommend.test.ts
 *   - packages/recommend-service/src/pipeline.test.ts
 */

// Types
export type {
  RecommendRequest,
  RecommendCandidate,
  RecommendFeedback,
  RecommendContext,
  RecommenderBackend,
  FeedbackType,
  CandidateSource,
  PipelineContext,
  PostProcessor,
  Ranker,
  RawCandidate,
  ScoredCandidate,
} from './types.js';
export { FEEDBACK_TYPES } from './types.js';

// Pipeline
export { PipelineExecutor } from './pipeline.js';
export {
  decodeDiscoveryCursor,
  DiscoveryService,
  encodeDiscoveryCursor,
} from './discovery/index.js';
export type {
  DiscoveryItem,
  DiscoveryRequest,
  DiscoveryResponse,
} from './discovery/index.js';
export type {
  FilterCondition,
  ProductVector,
  QdrantConfig,
  QdrantFilter,
  SearchOptions,
  SimilarityResult,
} from './qdrant/index.js';
export type {
  QdrantClientLike,
  QdrantServiceOptions,
  ResiliencePolicy,
} from './qdrant/index.js';

// Pure logic
export {
  validateRecommendRequest,
  mergeAndRankCandidates,
  filterExcludedProducts,
  normalizeScores,
  validateFeedbackType,
} from './logic.js';

// Registry
export { RecommenderRegistry } from './registry.js';

// Pipeline implementations
export {
  DiversityPostProcessor,
  PopularCandidateSource,
  QdrantCandidateSource,
  TakeRateBoostRanker,
} from './implementations/index.js';
export {
  buildQdrantFilter,
  cosineSimilarity,
  createDefaultSearchOptions,
  normalizeVector,
  QdrantService,
  validateProductVector,
  validateQdrantConfig,
  validateSearchOptions,
} from './qdrant/index.js';

// API handlers
export {
  getCandidates,
  submitFeedback,
  healthCheck,
  registry,
} from './recommend.js';
export type {
  GetCandidatesResponse,
  HealthCheckResponse,
} from './recommend.js';
