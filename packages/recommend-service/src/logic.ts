/**
 * Purpose: Pure business logic for the recommendation service.
 * All functions are free of side-effects and framework dependencies,
 * making them trivially testable with Vitest.
 *
 * Governing docs:
 *   - docs/architecture.md (§8 Recommender system, pluggable interfaces)
 *   - docs/domain-model.md
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 * Tests:
 *   - packages/recommend-service/src/recommend.test.ts
 */

import type { FeedbackType, RecommendCandidate, RecommendRequest } from './types.js';
import { FEEDBACK_TYPES } from './types.js';

const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

/**
 * Validate an incoming recommendation request.
 * @returns An error message string, or `undefined` when the request is valid.
 */
export function validateRecommendRequest(
  req: RecommendRequest,
): string | undefined {
  if (!req.userId || req.userId.trim().length === 0) {
    return 'userId is required and must be non-empty';
  }

  if (req.limit !== undefined) {
    if (!Number.isInteger(req.limit) || req.limit < MIN_LIMIT) {
      return `limit must be an integer >= ${MIN_LIMIT}`;
    }
    if (req.limit > MAX_LIMIT) {
      return `limit must not exceed ${MAX_LIMIT}`;
    }
  }

  return undefined;
}

/**
 * Merge candidate sets from multiple backends, deduplicate by productId
 * (keeping the highest score), sort descending by score, and truncate to
 * `limit`.
 */
export function mergeAndRankCandidates(
  candidateSets: readonly (readonly RecommendCandidate[])[],
  limit: number,
): RecommendCandidate[] {
  const best = new Map<string, RecommendCandidate>();

  for (const set of candidateSets) {
    for (const c of set) {
      const existing = best.get(c.productId);
      if (!existing || c.score > existing.score) {
        best.set(c.productId, c);
      }
    }
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Remove candidates whose productId appears in the exclusion list.
 */
export function filterExcludedProducts(
  candidates: readonly RecommendCandidate[],
  excludeIds: readonly string[],
): RecommendCandidate[] {
  if (excludeIds.length === 0) return [...candidates];
  const excluded = new Set(excludeIds);
  return candidates.filter((c) => !excluded.has(c.productId));
}

/**
 * Normalise candidate scores into the [0, 1] range using min-max scaling.
 * When all scores are identical (or there is a single candidate), each
 * score is set to 1.
 */
export function normalizeScores(
  candidates: readonly RecommendCandidate[],
): RecommendCandidate[] {
  if (candidates.length === 0) return [];

  const min = Math.min(...candidates.map((c) => c.score));
  const max = Math.max(...candidates.map((c) => c.score));
  const range = max - min;

  if (range === 0) {
    return candidates.map((c) => ({ ...c, score: 1 }));
  }

  return candidates.map((c) => ({
    ...c,
    score: (c.score - min) / range,
  }));
}

/**
 * Type-guard that validates a string is a known {@link FeedbackType}.
 */
export function validateFeedbackType(type: string): type is FeedbackType {
  return (FEEDBACK_TYPES as readonly string[]).includes(type);
}
