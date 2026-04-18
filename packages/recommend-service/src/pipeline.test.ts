/**
 * Purpose: Unit tests for the three-stage recommendation pipeline and its
 * initial pluggable implementations.
 *
 * Governing docs:
 *   - docs/architecture.md (§13.2 recommendation adapter architecture)
 *   - docs/domain-model.md (§4.1 Product, §4.7 Tag)
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 *   - https://github.com/spotify/voyager
 *   - https://qdrant.tech/documentation/
 * Tests:
 *   - packages/recommend-service/src/pipeline.test.ts
 */

import { describe, expect, it } from 'vitest';

import type {
  CandidateSource,
  PipelineContext,
  PostProcessor,
  Ranker,
  RawCandidate,
  ScoredCandidate,
} from './pipeline.js';
import { PipelineExecutor } from './pipeline.js';
import { DiversityPostProcessor } from './implementations/diversity-processor.js';
import { PopularCandidateSource } from './implementations/popular-source.js';
import { TakeRateBoostRanker } from './implementations/take-rate-ranker.js';

function rawCandidate(
  productId: string,
  source: string,
  metadata?: Record<string, unknown>,
): RawCandidate {
  return { productId, source, metadata };
}

function scoredCandidate(
  productId: string,
  score: number,
  metadata?: Record<string, unknown>,
): ScoredCandidate {
  return { productId, score, source: 'seed', metadata };
}

class StaticCandidateSource implements CandidateSource {
  constructor(
    public readonly name: string,
    private readonly candidates: readonly RawCandidate[],
  ) {}

  async getCandidates(): Promise<RawCandidate[]> {
    return [...this.candidates];
  }
}

class FixedRanker implements Ranker {
  constructor(
    public readonly name: string,
    private readonly scores: ReadonlyMap<string, number>,
  ) {}

  async rank(candidates: RawCandidate[]): Promise<ScoredCandidate[]> {
    return candidates.map((candidate) => ({
      ...candidate,
      score: this.scores.get(candidate.productId) ?? 0,
    }));
  }
}

class ScoreMultiplierRanker implements Ranker {
  constructor(
    public readonly name: string,
    private readonly multiplier: number,
  ) {}

  async rank(candidates: RawCandidate[]): Promise<ScoredCandidate[]> {
    return candidates.map((candidate) => ({
      ...candidate,
      score:
        ('score' in candidate ? candidate.score : 1) * this.multiplier,
    }));
  }
}

class ExcludingPostProcessor implements PostProcessor {
  constructor(
    public readonly name: string,
    private readonly excludedProductIds: ReadonlySet<string>,
  ) {}

  async process(candidates: ScoredCandidate[]): Promise<ScoredCandidate[]> {
    return candidates.filter(
      (candidate) => !this.excludedProductIds.has(candidate.productId),
    );
  }
}

class ScoreOffsetPostProcessor implements PostProcessor {
  constructor(
    public readonly name: string,
    private readonly offset: number,
  ) {}

  async process(candidates: ScoredCandidate[]): Promise<ScoredCandidate[]> {
    return candidates.map((candidate) => ({
      ...candidate,
      score: candidate.score + this.offset,
    }));
  }
}

const defaultContext: PipelineContext = {
  userId: 'user-1',
  limit: 10,
};

describe('PipelineExecutor', () => {
  it('returns an empty list when no sources are registered', async () => {
    const executor = new PipelineExecutor([], [], []);

    await expect(executor.execute(defaultContext)).resolves.toEqual([]);
  });

  it('returns candidates from a single source when no rankers are configured', async () => {
    const executor = new PipelineExecutor(
      [
        new StaticCandidateSource('popular', [
          rawCandidate('product-1', 'popular'),
          rawCandidate('product-2', 'popular'),
        ]),
      ],
      [],
      [],
    );

    await expect(executor.execute(defaultContext)).resolves.toEqual([
      { productId: 'product-1', score: 1, source: 'popular' },
      { productId: 'product-2', score: 1, source: 'popular' },
    ]);
  });

  it('merges multiple sources and keeps the richest metadata for duplicates', async () => {
    const executor = new PipelineExecutor(
      [
        new StaticCandidateSource('popular', [
          rawCandidate('product-1', 'popular', { creator: 'creator-a' }),
          rawCandidate('product-2', 'popular'),
        ]),
        new StaticCandidateSource('content', [
          rawCandidate('product-1', 'content', {
            creator: 'creator-a',
            category: 'shaders',
          }),
          rawCandidate('product-3', 'content'),
        ]),
      ],
      [],
      [],
    );

    await expect(executor.execute(defaultContext)).resolves.toEqual([
      {
        productId: 'product-1',
        score: 1,
        source: 'content',
        metadata: { creator: 'creator-a', category: 'shaders' },
      },
      { productId: 'product-2', score: 1, source: 'popular' },
      { productId: 'product-3', score: 1, source: 'content' },
    ]);
  });

  it('re-scores candidates with a single ranker', async () => {
    const executor = new PipelineExecutor(
      [
        new StaticCandidateSource('popular', [
          rawCandidate('product-1', 'popular'),
          rawCandidate('product-2', 'popular'),
        ]),
      ],
      [new FixedRanker('fixed', new Map([['product-1', 0.8], ['product-2', 0.4]]))],
      [],
    );

    const result = await executor.execute(defaultContext);

    expect(result.map((candidate) => [candidate.productId, candidate.score])).toEqual([
      ['product-1', 0.8],
      ['product-2', 0.4],
    ]);
  });

  it('chains multiple rankers sequentially', async () => {
    const executor = new PipelineExecutor(
      [new StaticCandidateSource('popular', [rawCandidate('product-1', 'popular')])],
      [
        new FixedRanker('seed-score', new Map([['product-1', 2]])),
        new ScoreMultiplierRanker('multiplier', 1.5),
      ],
      [],
    );

    const [candidate] = await executor.execute(defaultContext);

    expect(candidate).toMatchObject({ productId: 'product-1', score: 3 });
  });

  it('applies post-processors sequentially', async () => {
    const executor = new PipelineExecutor(
      [
        new StaticCandidateSource('popular', [
          rawCandidate('product-1', 'popular'),
          rawCandidate('product-2', 'popular'),
        ]),
      ],
      [new FixedRanker('fixed', new Map([['product-1', 0.2], ['product-2', 0.6]]))],
      [
        new ExcludingPostProcessor('exclude-product-1', new Set(['product-1'])),
        new ScoreOffsetPostProcessor('add-offset', 0.25),
      ],
    );

    await expect(executor.execute(defaultContext)).resolves.toEqual([
      { productId: 'product-2', source: 'popular', score: 0.85 },
    ]);
  });

  it('runs the full pipeline end-to-end', async () => {
    const executor = new PipelineExecutor(
      [
        new StaticCandidateSource('popular', [
          rawCandidate('product-1', 'popular', {
            creator: 'creator-a',
            category: 'audio',
          }),
          rawCandidate('product-2', 'popular', {
            creator: 'creator-a',
            category: 'audio',
          }),
        ]),
        new StaticCandidateSource('content', [
          rawCandidate('product-3', 'content', {
            creator: 'creator-b',
            category: 'audio',
          }),
          rawCandidate('product-4', 'content', {
            creator: 'creator-c',
            category: 'tools',
          }),
        ]),
      ],
      [new TakeRateBoostRanker(new Map([
        ['product-1', 0],
        ['product-2', 50],
        ['product-3', 100],
        ['product-4', 25],
      ]))],
      [new DiversityPostProcessor(1, 'creator')],
    );

    const result = await executor.execute({ ...defaultContext, limit: 3 });

    expect(result.map((candidate) => candidate.productId)).toEqual([
      'product-3',
      'product-4',
      'product-1',
    ]);
  });
});

describe('PopularCandidateSource', () => {
  it('returns candidates tagged with the source name', async () => {
    const source = new PopularCandidateSource(['product-1', 'product-2']);

    await expect(source.getCandidates('user-1', defaultContext)).resolves.toEqual([
      { productId: 'product-1', source: 'popular' },
      { productId: 'product-2', source: 'popular' },
    ]);
  });
});

describe('TakeRateBoostRanker', () => {
  it.each([
    { takeRateBoost: 0, expected: 1 },
    { takeRateBoost: 50, expected: 1.5 },
    { takeRateBoost: 100, expected: 2 },
  ])(
    'boosts scores using a $takeRateBoost% multiplier',
    async ({ takeRateBoost, expected }) => {
      const ranker = new TakeRateBoostRanker(
        new Map([['product-1', takeRateBoost]]),
      );

      const [candidate] = await ranker.rank([
        {
          productId: 'product-1',
          source: 'popular',
          score: 1,
        },
      ]);

      expect(candidate).toMatchObject({
        productId: 'product-1',
        score: expected,
      });
    },
  );
});

describe('DiversityPostProcessor', () => {
  it('caps each group to the configured maximum', async () => {
    const processor = new DiversityPostProcessor(1, 'creator');

    const result = await processor.process([
      scoredCandidate('product-1', 0.9, { creator: 'creator-a' }),
      scoredCandidate('product-2', 0.8, { creator: 'creator-a' }),
      scoredCandidate('product-3', 0.7, { creator: 'creator-b' }),
    ]);

    expect(result.map((candidate) => candidate.productId)).toEqual([
      'product-1',
      'product-3',
    ]);
  });

  it('interleaves groups while preserving within-group order', async () => {
    const processor = new DiversityPostProcessor(2, 'category');

    const result = await processor.process([
      scoredCandidate('product-1', 0.95, { category: 'audio' }),
      scoredCandidate('product-2', 0.9, { category: 'audio' }),
      scoredCandidate('product-3', 0.85, { category: 'tools' }),
      scoredCandidate('product-4', 0.8, { category: 'audio' }),
      scoredCandidate('product-5', 0.75, { category: 'tools' }),
      scoredCandidate('product-6', 0.7, { category: 'templates' }),
    ]);

    expect(result.map((candidate) => candidate.productId)).toEqual([
      'product-1',
      'product-3',
      'product-6',
      'product-2',
      'product-5',
    ]);
  });
});
