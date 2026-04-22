/**
 * Purpose: Unit tests for the recommend-service pure business logic.
 *
 * Governing docs:
 *   - docs/architecture.md (§8 Recommender system)
 * External references:
 *   - https://encore.dev/docs/ts/develop/testing
 * Tests cover:
 *   - RecommendRequest validation
 *   - mergeAndRankCandidates (merge, dedup, sort, limit)
 *   - filterExcludedProducts
 *   - normalizeScores
 *   - FeedbackType validation
 *   - RecommenderRegistry
 */

import { describe, it, expect } from 'vitest';

import type {
  RecommendCandidate,
  RecommendRequest,
  RecommenderBackend,
} from './types.js';

import {
  validateRecommendRequest,
  mergeAndRankCandidates,
  filterExcludedProducts,
  normalizeScores,
  validateFeedbackType,
} from './logic.js';

import { RecommenderRegistry } from './registry.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function candidate(
  productId: string,
  score: number,
  source: string,
): RecommendCandidate {
  return { productId, score, source };
}

/** Minimal stub backend used only in tests to exercise the registry. */
function fakeBackend(
  name: string,
  candidates: RecommendCandidate[] = [],
  healthy = true,
): RecommenderBackend {
  return {
    name,
    getCandidates: async () => candidates,
    submitFeedback: async () => {},
    healthCheck: async () => healthy,
  };
}

// ---------------------------------------------------------------------------
// validateRecommendRequest
// ---------------------------------------------------------------------------

describe('validateRecommendRequest', () => {
  it('returns an error when userId is empty', () => {
    const req: RecommendRequest = { userId: '' };
    expect(validateRecommendRequest(req)).toBeDefined();
  });

  it('returns an error when userId is whitespace-only', () => {
    const req: RecommendRequest = { userId: '   ' };
    expect(validateRecommendRequest(req)).toBeDefined();
  });

  it('returns an error when limit is 0', () => {
    const req: RecommendRequest = { userId: 'u1', limit: 0 };
    expect(validateRecommendRequest(req)).toBeDefined();
  });

  it('returns an error when limit is negative', () => {
    const req: RecommendRequest = { userId: 'u1', limit: -5 };
    expect(validateRecommendRequest(req)).toBeDefined();
  });

  it('returns an error when limit exceeds 100', () => {
    const req: RecommendRequest = { userId: 'u1', limit: 101 };
    expect(validateRecommendRequest(req)).toBeDefined();
  });

  it('returns undefined for a valid request with defaults', () => {
    const req: RecommendRequest = { userId: 'u1' };
    expect(validateRecommendRequest(req)).toBeUndefined();
  });

  it('returns undefined for a valid request with explicit limit', () => {
    const req: RecommendRequest = { userId: 'u1', limit: 50 };
    expect(validateRecommendRequest(req)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// RecommendCandidate structure
// ---------------------------------------------------------------------------

describe('RecommendCandidate structure', () => {
  it('contains productId, score, and source', () => {
    const c = candidate('prod-1', 0.95, 'voyager');
    expect(c).toHaveProperty('productId', 'prod-1');
    expect(c).toHaveProperty('score', 0.95);
    expect(c).toHaveProperty('source', 'voyager');
  });
});

// ---------------------------------------------------------------------------
// mergeAndRankCandidates
// ---------------------------------------------------------------------------

describe('mergeAndRankCandidates', () => {
  it('merges candidates from multiple backends', () => {
    const setA = [candidate('p1', 0.9, 'a')];
    const setB = [candidate('p2', 0.8, 'b')];
    const result = mergeAndRankCandidates([setA, setB], 10);
    expect(result).toHaveLength(2);
  });

  it('deduplicates by productId keeping highest score', () => {
    const setA = [candidate('p1', 0.7, 'a')];
    const setB = [candidate('p1', 0.9, 'b')];
    const result = mergeAndRankCandidates([setA, setB], 10);
    expect(result).toHaveLength(1);
    expect(result[0]!.score).toBe(0.9);
    expect(result[0]!.source).toBe('b');
  });

  it('sorts by score descending', () => {
    const setA = [candidate('p1', 0.5, 'a'), candidate('p2', 0.9, 'a')];
    const setB = [candidate('p3', 0.7, 'b')];
    const result = mergeAndRankCandidates([setA, setB], 10);
    expect(result.map((c) => c.productId)).toEqual(['p2', 'p3', 'p1']);
  });

  it('respects limit parameter', () => {
    const set = Array.from({ length: 20 }, (_, i) =>
      candidate(`p${i}`, i / 20, 'a'),
    );
    const result = mergeAndRankCandidates([set], 5);
    expect(result).toHaveLength(5);
  });

  it('handles empty results from one backend gracefully', () => {
    const setA: RecommendCandidate[] = [];
    const setB = [candidate('p1', 0.8, 'b')];
    const result = mergeAndRankCandidates([setA, setB], 10);
    expect(result).toHaveLength(1);
    expect(result[0]!.productId).toBe('p1');
  });

  it('handles all-empty input', () => {
    const result = mergeAndRankCandidates([[], []], 10);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterExcludedProducts
// ---------------------------------------------------------------------------

describe('filterExcludedProducts', () => {
  it('removes excluded product IDs', () => {
    const candidates = [
      candidate('p1', 0.9, 'a'),
      candidate('p2', 0.8, 'a'),
      candidate('p3', 0.7, 'a'),
    ];
    const result = filterExcludedProducts(candidates, ['p2']);
    expect(result.map((c) => c.productId)).toEqual(['p1', 'p3']);
  });

  it('returns all candidates when exclude list is empty', () => {
    const candidates = [candidate('p1', 0.9, 'a')];
    const result = filterExcludedProducts(candidates, []);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// normalizeScores
// ---------------------------------------------------------------------------

describe('normalizeScores', () => {
  it('normalizes scores to 0-1 range', () => {
    const candidates = [
      candidate('p1', 50, 'a'),
      candidate('p2', 100, 'a'),
      candidate('p3', 0, 'a'),
    ];
    const result = normalizeScores(candidates);
    expect(result.find((c) => c.productId === 'p2')!.score).toBe(1);
    expect(result.find((c) => c.productId === 'p3')!.score).toBe(0);
    expect(result.find((c) => c.productId === 'p1')!.score).toBe(0.5);
  });

  it('handles single candidate (score becomes 1)', () => {
    const result = normalizeScores([candidate('p1', 42, 'a')]);
    expect(result[0]!.score).toBe(1);
  });

  it('handles empty input', () => {
    expect(normalizeScores([])).toEqual([]);
  });

  it('handles candidates with identical scores', () => {
    const result = normalizeScores([
      candidate('p1', 5, 'a'),
      candidate('p2', 5, 'a'),
    ]);
    // All equal → all get score 1
    expect(result.every((c) => c.score === 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateFeedbackType
// ---------------------------------------------------------------------------

describe('validateFeedbackType', () => {
  it.each(['click', 'purchase', 'dismiss'] as const)(
    'accepts "%s"',
    (type) => {
      expect(validateFeedbackType(type)).toBe(true);
    },
  );

  it('rejects unknown types', () => {
    expect(validateFeedbackType('like')).toBe(false);
    expect(validateFeedbackType('')).toBe(false);
    expect(validateFeedbackType('CLICK')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RecommenderRegistry
// ---------------------------------------------------------------------------

describe('RecommenderRegistry', () => {
  it('starts empty', () => {
    const reg = new RecommenderRegistry();
    expect(reg.getAll()).toHaveLength(0);
  });

  it('registers a backend', () => {
    const reg = new RecommenderRegistry();
    reg.register(fakeBackend('voyager'));
    expect(reg.getAll()).toHaveLength(1);
    expect(reg.getAll()[0]!.name).toBe('voyager');
  });

  it('prevents duplicate registration', () => {
    const reg = new RecommenderRegistry();
    reg.register(fakeBackend('voyager'));
    expect(() => reg.register(fakeBackend('voyager'))).toThrow();
  });

  it('unregisters a backend by name', () => {
    const reg = new RecommenderRegistry();
    reg.register(fakeBackend('voyager'));
    reg.unregister('voyager');
    expect(reg.getAll()).toHaveLength(0);
  });

  it('throws when unregistering unknown backend', () => {
    const reg = new RecommenderRegistry();
    expect(() => reg.unregister('nope')).toThrow();
  });

  it('getCandidatesFromAll collects results from all backends', async () => {
    const reg = new RecommenderRegistry();
    reg.register(fakeBackend('a', [candidate('p1', 0.9, 'a')]));
    reg.register(fakeBackend('b', [candidate('p2', 0.8, 'b')]));
    const req: RecommendRequest = { userId: 'u1' };
    const results = await reg.getCandidatesFromAll(req);
    expect(results).toHaveLength(2);
    expect(results[0]).toHaveLength(1);
    expect(results[1]).toHaveLength(1);
  });

  it('getCandidatesFromAll returns empty array when no backends', async () => {
    const reg = new RecommenderRegistry();
    const results = await reg.getCandidatesFromAll({ userId: 'u1' });
    expect(results).toHaveLength(0);
  });
});
