/**
 * Purpose: Shared type contracts for the Qdrant-backed vector search service.
 *
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, §9 outbound calls)
 *   - docs/service-architecture.md (§1.9 Qdrant)
 *   - docs/domain-model.md (§1 Embedding)
 * External references:
 *   - https://qdrant.tech/documentation/
 *   - https://api.qdrant.tech/api-reference/collections/create-collection
 * Tests:
 *   - packages/recommend-service/src/qdrant/qdrant.service.test.ts
 */

export interface QdrantConfig {
  readonly url: string;
  readonly apiKey?: string;
  readonly collectionName: string;
  readonly vectorSize: number;
  readonly distanceMetric: 'Cosine' | 'Euclid' | 'Dot';
}

export interface ProductVector {
  readonly productId: string;
  readonly vector: readonly number[];
  readonly payload: {
    readonly name: string;
    readonly creatorId: string;
    readonly categoryId: string;
    readonly tags: readonly string[];
    readonly price: number;
    readonly salesCount: number;
    readonly createdAt: string;
  };
}

export interface SimilarityResult {
  readonly productId: string;
  readonly score: number;
  readonly payload: Record<string, unknown>;
}

export interface SearchOptions {
  readonly vector: readonly number[];
  readonly limit: number;
  readonly scoreThreshold?: number;
  readonly filter?: QdrantFilter;
}

export interface QdrantFilter {
  readonly must?: readonly FilterCondition[];
  readonly mustNot?: readonly FilterCondition[];
}

export interface FilterCondition {
  readonly key: string;
  readonly match?: { value: string | number | boolean };
  readonly range?: { gte?: number; lte?: number };
}
