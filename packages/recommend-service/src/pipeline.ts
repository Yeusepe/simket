/**
 * Purpose: Defines the three-stage recommendation pipeline contract and
 * executes candidate retrieval, ranking, and post-processing.
 *
 * Governing docs:
 *   - docs/architecture.md (§13.2 recommendation adapter architecture)
 *   - docs/service-architecture.md (§1.2 Recommend service API)
 *   - docs/domain-model.md (§4.1 Product, §4.7 Tag)
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 *   - https://github.com/spotify/voyager
 *   - https://qdrant.tech/documentation/
 * Tests:
 *   - packages/recommend-service/src/pipeline.test.ts
 */

export interface CandidateSource {
  readonly name: string;
  getCandidates(userId: string, context: PipelineContext): Promise<RawCandidate[]>;
}

export interface Ranker {
  readonly name: string;
  rank(candidates: RawCandidate[], context: PipelineContext): Promise<ScoredCandidate[]>;
}

export interface PostProcessor {
  readonly name: string;
  process(
    candidates: ScoredCandidate[],
    context: PipelineContext,
  ): Promise<ScoredCandidate[]>;
}

export interface PipelineContext {
  readonly userId: string;
  readonly limit: number;
  readonly excludeProductIds?: readonly string[];
  readonly tags?: readonly string[];
}

export interface RawCandidate {
  readonly productId: string;
  readonly source: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ScoredCandidate extends RawCandidate {
  readonly score: number;
}

function isScoredCandidate(candidate: RawCandidate): candidate is ScoredCandidate {
  return (
    'score' in candidate &&
    typeof (candidate as { score?: unknown }).score === 'number'
  );
}

function metadataRichness(metadata?: Record<string, unknown>): number {
  return metadata ? Object.keys(metadata).length : 0;
}

function deduplicateCandidates(
  candidates: readonly RawCandidate[],
): RawCandidate[] {
  const deduplicated = new Map<string, RawCandidate>();

  for (const candidate of candidates) {
    const existing = deduplicated.get(candidate.productId);
    if (!existing) {
      deduplicated.set(candidate.productId, candidate);
      continue;
    }

    if (
      metadataRichness(candidate.metadata) >
      metadataRichness(existing.metadata)
    ) {
      deduplicated.set(candidate.productId, candidate);
    }
  }

  return [...deduplicated.values()];
}

function filterExcludedCandidates(
  candidates: readonly RawCandidate[],
  excludeProductIds?: readonly string[],
): RawCandidate[] {
  if (!excludeProductIds || excludeProductIds.length === 0) {
    return [...candidates];
  }

  const excluded = new Set(excludeProductIds);
  return candidates.filter((candidate) => !excluded.has(candidate.productId));
}

function toScoredCandidates(
  candidates: readonly RawCandidate[],
): ScoredCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    score: isScoredCandidate(candidate) ? candidate.score : 1,
  }));
}

export class PipelineExecutor {
  constructor(
    private readonly sources: CandidateSource[],
    private readonly rankers: Ranker[],
    private readonly postProcessors: PostProcessor[],
  ) {}

  async execute(context: PipelineContext): Promise<ScoredCandidate[]> {
    if (this.sources.length === 0) {
      return [];
    }

    const candidateSets = await Promise.all(
      this.sources.map((source) =>
        source.getCandidates(context.userId, context),
      ),
    );

    const mergedCandidates = deduplicateCandidates(candidateSets.flat());
    const filteredCandidates = filterExcludedCandidates(
      mergedCandidates,
      context.excludeProductIds,
    );

    let rankedCandidates =
      this.rankers.length === 0
        ? toScoredCandidates(filteredCandidates)
        : await this.rankers[0]!.rank(filteredCandidates, context);

    for (const ranker of this.rankers.slice(1)) {
      rankedCandidates = await ranker.rank(rankedCandidates, context);
    }

    let processedCandidates = rankedCandidates;
    for (const postProcessor of this.postProcessors) {
      processedCandidates = await postProcessor.process(
        processedCandidates,
        context,
      );
    }

    return [...processedCandidates]
      .sort((left, right) => right.score - left.score)
      .slice(0, context.limit);
  }
}
