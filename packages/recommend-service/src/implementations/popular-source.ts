/**
 * Purpose: Baseline candidate source that returns a configured popular-product
 * fallback set.
 *
 * Governing docs:
 *   - docs/architecture.md (§13.2 recommendation adapter architecture)
 *   - docs/service-architecture.md (§1.2 Recommend service API)
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 * Tests:
 *   - packages/recommend-service/src/pipeline.test.ts
 */

import type { CandidateSource, PipelineContext, RawCandidate } from '../pipeline.js';

const DEFAULT_POPULAR_PRODUCT_IDS = [
  'popular-product-1',
  'popular-product-2',
  'popular-product-3',
  'popular-product-4',
  'popular-product-5',
] as const;

export class PopularCandidateSource implements CandidateSource {
  readonly name = 'popular';

  constructor(
    private readonly productIds: readonly string[] = DEFAULT_POPULAR_PRODUCT_IDS,
  ) {}

  async getCandidates(
    _userId: string,
    context: PipelineContext,
  ): Promise<RawCandidate[]> {
    return this.productIds.slice(0, context.limit).map((productId) => ({
      productId,
      source: this.name,
    }));
  }
}
