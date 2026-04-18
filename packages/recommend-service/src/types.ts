/**
 * Purpose: Type definitions for the recommendation service.
 * Defines the pluggable RecommenderBackend interface and all request/response types.
 *
 * Governing docs:
 *   - docs/architecture.md (§8 Recommender system, pluggable interfaces)
 *   - docs/domain-model.md
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 *   - https://github.com/spotify/voyager (potential backend)
 *   - https://qdrant.tech/documentation/ (potential backend)
 * Tests:
 *   - packages/recommend-service/src/recommend.test.ts
 */

// --- Feedback ---

/** Allowed user-feedback types for recommendation interactions. */
export const FEEDBACK_TYPES = ['click', 'purchase', 'dismiss'] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

// --- Request / Response ---

/** Contextual hints that can influence recommendation ranking. */
export interface RecommendContext {
  /** Current category the user is browsing, if any. */
  readonly categoryId?: string;
  /** Current storefront ID. */
  readonly storefrontId?: string;
  /** Free-form key/value pairs backends may use for ranking. */
  readonly tags?: Readonly<Record<string, string>>;
}

/** Inbound request for product recommendations. */
export interface RecommendRequest {
  /** The user to generate recommendations for. */
  readonly userId: string;
  /** Maximum number of results to return (1–100, default 20). */
  readonly limit?: number;
  /** Product IDs to exclude (e.g. already purchased). */
  readonly excludeProductIds?: readonly string[];
  /** Optional contextual hints. */
  readonly context?: RecommendContext;
}

/** A single recommendation candidate returned by a backend. */
export interface RecommendCandidate {
  /** The product being recommended. */
  readonly productId: string;
  /** Relevance score in the range [0, 1]. */
  readonly score: number;
  /** Name of the RecommenderBackend that produced this candidate. */
  readonly source: string;
  /** Arbitrary metadata from the backend (explanation, features, etc.). */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** User feedback on a recommendation. */
export interface RecommendFeedback {
  readonly userId: string;
  readonly productId: string;
  readonly feedbackType: FeedbackType;
  readonly timestamp: number;
}

// --- Pluggable backend interface ---

/**
 * Contract every recommender backend must satisfy.
 * Implementations wrap a specific engine (Voyager, Qdrant, OpenOneRec, …)
 * and are registered at runtime via {@link RecommenderRegistry}.
 */
export interface RecommenderBackend {
  /** Human-readable, unique name for this backend. */
  readonly name: string;

  /** Return scored candidates for the given request. */
  getCandidates(request: RecommendRequest): Promise<RecommendCandidate[]>;

  /** Ingest user-interaction feedback for model improvement. */
  submitFeedback(feedback: RecommendFeedback): Promise<void>;

  /** Return true when the backend is healthy and reachable. */
  healthCheck(): Promise<boolean>;
}
