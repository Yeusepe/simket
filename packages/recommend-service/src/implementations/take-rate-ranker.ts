/**
 * Purpose: Ranker that applies a take-rate multiplier to candidate scores.
 *
 * Governing docs:
 *   - docs/architecture.md (§13.2 recommendation adapter architecture)
 *   - docs/domain-model.md (§4.1 Product take rate)
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 * Tests:
 *   - packages/recommend-service/src/pipeline.test.ts
 */

import type {
  PipelineContext,
  Ranker,
  RawCandidate,
  ScoredCandidate,
} from '../pipeline.js';

function isScoredCandidate(candidate: RawCandidate): candidate is ScoredCandidate {
  return (
    'score' in candidate &&
    typeof (candidate as { score?: unknown }).score === 'number'
  );
}

function getBaseScore(candidate: RawCandidate): number {
  return isScoredCandidate(candidate) ? candidate.score : 1;
}

export class TakeRateBoostRanker implements Ranker {
  readonly name = 'take-rate-boost';

  constructor(private readonly takeRateMap: ReadonlyMap<string, number>) {}

  async rank(
    candidates: RawCandidate[],
    context: PipelineContext,
  ): Promise<ScoredCandidate[]> {
    void context;
    return candidates.map((candidate) => {
      const takeRateBoost = this.takeRateMap.get(candidate.productId) ?? 0;
      return {
        ...candidate,
        score: getBaseScore(candidate) * (1 + takeRateBoost / 100),
      };
    });
  }
}
