/**
 * Purpose: Verify cursor pagination, fallback behavior, ordering, and request
 * validation for the discovery feed service.
 *
 * Governing docs:
 *   - docs/architecture.md (§2 pluggable recommenders, §6 discovery)
 *   - docs/service-architecture.md (§1.2 Recommend service API)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/
 * Tests:
 *   - packages/recommend-service/src/discovery/discovery.service.test.ts
 */

import { describe, expect, it } from 'vitest';

import type { CandidateSource, RawCandidate, Ranker, ScoredCandidate } from '../pipeline.js';
import { PipelineExecutor } from '../pipeline.js';
import { PopularCandidateSource } from '../implementations/popular-source.js';
import {
  decodeDiscoveryCursor,
  DiscoveryService,
  encodeDiscoveryCursor,
} from './discovery.service.js';
import type { DiscoveryRequest } from './discovery.types.js';

class PersonalizedCandidateSource implements CandidateSource {
  readonly name = 'purchase-history';

  constructor(
    private readonly candidatesByUser: ReadonlyMap<string, readonly RawCandidate[]>,
  ) {}

  async getCandidates(userId: string): Promise<RawCandidate[]> {
    return [...(this.candidatesByUser.get(userId) ?? [])];
  }
}

class FixedScoreRanker implements Ranker {
  readonly name = 'fixed-score';

  constructor(private readonly scores: ReadonlyMap<string, number>) {}

  async rank(candidates: RawCandidate[]): Promise<ScoredCandidate[]> {
    return candidates.map((candidate) => ({
      ...candidate,
      score: this.scores.get(candidate.productId) ?? 0,
    }));
  }
}

function personalizedCandidate(
  productId: string,
  reason: string,
  source = 'purchase-history',
): RawCandidate {
  return {
    productId,
    source,
    metadata: { reason },
  };
}

function createService(): DiscoveryService {
  const personalizedPipeline = new PipelineExecutor(
    [
      new PersonalizedCandidateSource(
        new Map<string, readonly RawCandidate[]>([
          [
            'returning-user',
            [
              personalizedCandidate('product-1', 'Based on your purchase of Shader Lab'),
              personalizedCandidate('product-2', 'Based on your purchase of Ambient Toolkit'),
              personalizedCandidate('product-3', 'Based on your purchase of Animation Pro'),
            ],
          ],
          [
            'ordered-user',
            [
              personalizedCandidate('product-a', 'Based on your purchase of Audio Forge'),
              personalizedCandidate('product-b', 'Based on your purchase of VFX Mastery'),
              personalizedCandidate('product-c', 'Based on your purchase of Mesh Wizard'),
            ],
          ],
          [
            'large-page-user',
            Array.from({ length: 80 }, (_, index) =>
              personalizedCandidate(
                `bulk-product-${index + 1}`,
                `Based on your purchase of Bundle ${index + 1}`,
              ),
            ),
          ],
        ]),
      ),
    ],
    [
      new FixedScoreRanker(
        new Map<string, number>([
          ['product-1', 0.95],
          ['product-2', 0.85],
          ['product-3', 0.75],
          ['product-a', 0.3],
          ['product-b', 0.9],
          ['product-c', 0.6],
          ...Array.from({ length: 80 }, (_, index) => [
            `bulk-product-${index + 1}`,
            1 - index / 100,
          ]),
        ]),
      ),
    ],
    [],
  );

  const fallbackPipeline = new PipelineExecutor(
    [
      new PopularCandidateSource([
        'popular-1',
        'popular-2',
        'popular-3',
      ]),
    ],
    [],
    [],
  );

  return new DiscoveryService({
    personalizedPipeline,
    fallbackPipeline,
  });
}

function request(overrides: Partial<DiscoveryRequest> = {}): DiscoveryRequest {
  return {
    userId: 'returning-user',
    pageSize: 2,
    ...overrides,
  };
}

describe('DiscoveryService', () => {
  it('returns a next cursor for the first page and omits it on the last page', async () => {
    const service = createService();

    const firstPage = await service.getDiscoveryFeed(request());
    const finalPage = await service.getDiscoveryFeed(
      request({ cursor: firstPage.nextCursor }),
    );

    expect(firstPage.items.map((item) => item.product.id)).toEqual([
      'product-1',
      'product-2',
    ]);
    expect(firstPage.nextCursor).toBeDefined();
    expect(finalPage.items.map((item) => item.product.id)).toEqual(['product-3']);
    expect(finalPage.nextCursor).toBeUndefined();
  });

  it('clamps page sizes above the maximum of 50 items', async () => {
    const service = createService();

    const response = await service.getDiscoveryFeed(
      request({ userId: 'large-page-user', pageSize: 100 }),
    );

    expect(response.items).toHaveLength(50);
  });

  it('filters already seen product IDs before pagination', async () => {
    const service = createService();

    const response = await service.getDiscoveryFeed(
      request({ excludeIds: ['product-2'], pageSize: 5 }),
    );

    expect(response.items.map((item) => item.product.id)).toEqual([
      'product-1',
      'product-3',
    ]);
  });

  it('falls back to popular items when personalization returns no candidates', async () => {
    const service = createService();

    const response = await service.getDiscoveryFeed(
      request({ userId: 'new-user', pageSize: 3 }),
    );

    expect(response.items.map((item) => item.product.id)).toEqual([
      'popular-1',
      'popular-2',
      'popular-3',
    ]);
    expect(response.items.every((item) => item.source === 'popular')).toBe(true);
  });

  it('sorts feed items by descending recommendation score', async () => {
    const service = createService();

    const response = await service.getDiscoveryFeed(
      request({ userId: 'ordered-user', pageSize: 5 }),
    );

    expect(response.items.map((item) => [item.product.id, item.score])).toEqual([
      ['product-b', 0.9],
      ['product-c', 0.6],
      ['product-a', 0.3],
    ]);
  });
});

describe('discovery cursors', () => {
  it('round-trips offsets through base64 cursor encoding', () => {
    const cursor = encodeDiscoveryCursor(40);

    expect(typeof cursor).toBe('string');
    expect(decodeDiscoveryCursor(cursor)).toBe(40);
  });

  it('rejects malformed cursors', () => {
    expect(() => decodeDiscoveryCursor('not-base64')).toThrow(/cursor/i);
  });
});
