/**
 * Purpose: Runtime registry for pluggable recommender backends.
 * Backends register themselves at startup; the service queries all of them
 * in parallel when producing recommendations.
 *
 * Governing docs:
 *   - docs/architecture.md (§8 Recommender system, pluggable interfaces)
 * External references:
 *   - https://github.com/spotify/voyager (potential backend)
 *   - https://qdrant.tech/documentation/ (potential backend)
 * Tests:
 *   - packages/recommend-service/src/recommend.test.ts
 */

import type {
  RecommendCandidate,
  RecommendRequest,
  RecommenderBackend,
} from './types.js';

/**
 * Thread-safe (single-threaded JS) registry of {@link RecommenderBackend}
 * instances. Backends are identified by their unique `name` property.
 */
export class RecommenderRegistry {
  private readonly backends = new Map<string, RecommenderBackend>();

  /** Register a new backend. Throws if a backend with the same name exists. */
  register(backend: RecommenderBackend): void {
    if (this.backends.has(backend.name)) {
      throw new Error(
        `RecommenderBackend "${backend.name}" is already registered`,
      );
    }
    this.backends.set(backend.name, backend);
  }

  /** Remove a backend by name. Throws if the name is unknown. */
  unregister(name: string): void {
    if (!this.backends.has(name)) {
      throw new Error(`RecommenderBackend "${name}" is not registered`);
    }
    this.backends.delete(name);
  }

  /** Return a snapshot of all registered backends. */
  getAll(): RecommenderBackend[] {
    return [...this.backends.values()];
  }

  /**
   * Query every registered backend in parallel and return an array of
   * candidate arrays (one per backend).
   */
  async getCandidatesFromAll(
    request: RecommendRequest,
  ): Promise<RecommendCandidate[][]> {
    const backends = this.getAll();
    if (backends.length === 0) return [];
    return Promise.all(
      backends.map((b) => b.getCandidates(request)),
    );
  }
}
