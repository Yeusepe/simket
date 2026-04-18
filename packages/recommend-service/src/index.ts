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
 */

// Types
export type {
  RecommendRequest,
  RecommendCandidate,
  RecommendFeedback,
  RecommendContext,
  RecommenderBackend,
  FeedbackType,
} from './types.js';
export { FEEDBACK_TYPES } from './types.js';

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
