/**
 * Purpose: Re-exports the default recommendation pipeline implementations.
 *
 * Governing docs:
 *   - docs/architecture.md (§13.2 recommendation adapter architecture)
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 * Tests:
 *   - packages/recommend-service/src/pipeline.test.ts
 */

export { PopularCandidateSource } from './popular-source.js';
export { TakeRateBoostRanker } from './take-rate-ranker.js';
export { DiversityPostProcessor } from './diversity-processor.js';
