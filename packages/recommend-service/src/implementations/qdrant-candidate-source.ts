/**
 * Purpose: Candidate source that queries Qdrant for products similar to a
 * user's purchase-history embedding.
 *
 * Governing docs:
 *   - docs/architecture.md (§4 pluggable recommenders)
 *   - docs/service-architecture.md (§1.2 Recommend service API, §1.9 Qdrant)
 * External references:
 *   - https://qdrant.tech/documentation/
 * Tests:
 *   - packages/recommend-service/src/qdrant/qdrant.service.test.ts
 */

import type { CandidateSource, PipelineContext, RawCandidate } from '../pipeline.js';
import {
  buildQdrantFilter,
  type QdrantService,
  type SimilarityResult,
} from '../qdrant/index.js';

export interface QdrantCandidateSourceOptions {
  readonly qdrantService: Pick<QdrantService, 'searchSimilar'>;
  readonly resolveUserVector: (
    userId: string,
    context: PipelineContext,
  ) => Promise<readonly number[] | undefined>;
  readonly scoreThreshold?: number;
}

function toCandidate(result: SimilarityResult): RawCandidate {
  return {
    productId: result.productId,
    source: 'qdrant',
    score: result.score,
    metadata: {
      qdrantScore: result.score,
      payload: result.payload,
    },
  } as RawCandidate;
}

export class QdrantCandidateSource implements CandidateSource {
  readonly name = 'qdrant';

  constructor(private readonly options: QdrantCandidateSourceOptions) {}

  async getCandidates(
    userId: string,
    context: PipelineContext,
  ): Promise<RawCandidate[]> {
    const vector = await this.options.resolveUserVector(userId, context);
    if (!vector || vector.length === 0) {
      return [];
    }

    const filter = buildQdrantFilter({
      excludeIds: context.excludeProductIds ? [...context.excludeProductIds] : undefined,
    });
    const results = await this.options.qdrantService.searchSimilar({
      vector,
      limit: context.limit,
      scoreThreshold: this.options.scoreThreshold,
      filter,
    });

    return results.map(toCandidate);
  }
}
