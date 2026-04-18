/**
 * Purpose: Encore-based recommendation service API endpoints.
 * Exposes getCandidates, submitFeedback, and healthCheck as async functions
 * ready to be wired to Encore's `api()` when the Encore runtime is available.
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

import {
  validateRecommendRequest,
  mergeAndRankCandidates,
  filterExcludedProducts,
  normalizeScores,
  validateFeedbackType,
} from './logic.js';
import { RecommenderRegistry } from './registry.js';
import type {
  RecommendCandidate,
  RecommendFeedback,
  RecommendRequest,
} from './types.js';

// ---------------------------------------------------------------------------
// Service-level singleton registry
// ---------------------------------------------------------------------------

const registry = new RecommenderRegistry();

/** Expose registry for backend registration at startup. */
export { registry };

// ---------------------------------------------------------------------------
// Request / response shapes for Encore endpoints
// ---------------------------------------------------------------------------

export interface GetCandidatesResponse {
  readonly candidates: RecommendCandidate[];
}

export interface HealthCheckResponse {
  readonly healthy: boolean;
  readonly backends: readonly { name: string; healthy: boolean }[];
}

// ---------------------------------------------------------------------------
// Endpoint handlers (plain async fns — wire to Encore `api()` at boot)
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 20;

/**
 * Get personalised product recommendations for a user.
 *
 * Encore wiring (when runtime available):
 * ```ts
 * import { api } from "encore.dev/api";
 * export const getRecommendations = api(
 *   { expose: true, method: "POST", path: "/recommend" },
 *   getCandidates,
 * );
 * ```
 */
export async function getCandidates(
  req: RecommendRequest,
): Promise<GetCandidatesResponse> {
  const validationError = validateRecommendRequest(req);
  if (validationError) {
    throw new Error(validationError);
  }

  const limit = req.limit ?? DEFAULT_LIMIT;

  const candidateSets = await registry.getCandidatesFromAll(req);

  let merged = mergeAndRankCandidates(candidateSets, limit);

  if (req.excludeProductIds && req.excludeProductIds.length > 0) {
    merged = filterExcludedProducts(merged, req.excludeProductIds);
  }

  merged = normalizeScores(merged);

  return { candidates: merged };
}

/**
 * Submit user interaction feedback for model improvement.
 *
 * Encore wiring:
 * ```ts
 * export const postFeedback = api(
 *   { expose: true, method: "POST", path: "/recommend/feedback" },
 *   submitFeedback,
 * );
 * ```
 */
export async function submitFeedback(
  feedback: RecommendFeedback,
): Promise<void> {
  if (!validateFeedbackType(feedback.feedbackType)) {
    throw new Error(
      `Invalid feedback type "${feedback.feedbackType}". ` +
        `Allowed: click, purchase, dismiss`,
    );
  }

  const backends = registry.getAll();
  await Promise.all(backends.map((b) => b.submitFeedback(feedback)));
}

/**
 * Health check across all registered backends.
 *
 * Encore wiring:
 * ```ts
 * export const health = api(
 *   { expose: true, method: "GET", path: "/recommend/health" },
 *   healthCheck,
 * );
 * ```
 */
export async function healthCheck(): Promise<HealthCheckResponse> {
  const backends = registry.getAll();

  const statuses = await Promise.all(
    backends.map(async (b) => ({
      name: b.name,
      healthy: await b.healthCheck().catch(() => false),
    })),
  );

  const allHealthy =
    statuses.length > 0 && statuses.every((s) => s.healthy);

  return { healthy: allHealthy, backends: statuses };
}
