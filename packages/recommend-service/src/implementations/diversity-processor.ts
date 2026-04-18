/**
 * Purpose: Post-processor that caps repeated creator/category exposure and
 * interleaves groups for a more diverse recommendation set.
 *
 * Governing docs:
 *   - docs/architecture.md (§13.2 recommendation adapter architecture)
 *   - docs/domain-model.md (§4.1 Product, §4.7 Tag)
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 * Tests:
 *   - packages/recommend-service/src/pipeline.test.ts
 */

import type {
  PipelineContext,
  PostProcessor,
  ScoredCandidate,
} from '../pipeline.js';

type DiversityGroup = 'creator' | 'category';

function getGroupKey(
  candidate: ScoredCandidate,
  groupBy: DiversityGroup,
): string {
  const value = candidate.metadata?.[groupBy];
  return typeof value === 'string' && value.length > 0
    ? value
    : `ungrouped:${candidate.productId}`;
}

export class DiversityPostProcessor implements PostProcessor {
  readonly name: string;

  constructor(
    private readonly maxPerGroup: number,
    private readonly groupBy: DiversityGroup,
  ) {
    if (!Number.isInteger(maxPerGroup) || maxPerGroup < 1) {
      throw new Error('maxPerGroup must be an integer greater than 0');
    }

    this.name = `diversity-${groupBy}`;
  }

  async process(
    candidates: ScoredCandidate[],
    _context: PipelineContext,
  ): Promise<ScoredCandidate[]> {
    const groupedCandidates = new Map<string, ScoredCandidate[]>();

    for (const candidate of candidates) {
      const groupKey = getGroupKey(candidate, this.groupBy);
      const group = groupedCandidates.get(groupKey) ?? [];

      if (group.length < this.maxPerGroup) {
        group.push(candidate);
      }

      if (!groupedCandidates.has(groupKey)) {
        groupedCandidates.set(groupKey, group);
      }
    }

    const remainingGroups = [...groupedCandidates.values()].filter(
      (group) => group.length > 0,
    );
    const interleaved: ScoredCandidate[] = [];

    while (remainingGroups.some((group) => group.length > 0)) {
      for (const group of remainingGroups) {
        const nextCandidate = group.shift();
        if (nextCandidate) {
          interleaved.push(nextCandidate);
        }
      }
    }

    return interleaved;
  }
}
