/**
 * Purpose: Unit tests for the Qdrant vector service helpers, validation rules,
 * and candidate-source integration.
 *
 * Governing docs:
 *   - docs/architecture.md (§2 outbound calls through Cockatiel, §5 vector store)
 *   - docs/service-architecture.md (§1.2 Recommend service API, §1.9 Qdrant)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://qdrant.tech/documentation/
 *   - https://api.qdrant.tech/api-reference/collections/create-collection
 *   - https://api.qdrant.tech/api-reference/points/upsert-points
 *   - https://api.qdrant.tech/api-reference/points/scroll-points
 *   - https://api.qdrant.tech/api-reference/search/points
 *   - https://github.com/qdrant/qdrant-js/tree/master/packages/js-client-rest
 * Tests:
 *   - packages/recommend-service/src/qdrant/qdrant.service.test.ts
 */

import { describe, expect, it, vi } from 'vitest';

import type { PipelineContext } from '../pipeline.js';
import { QdrantCandidateSource } from '../implementations/qdrant-candidate-source.js';
import type {
  ProductVector,
  QdrantConfig,
  SearchOptions,
} from './qdrant.types.js';
import {
  buildQdrantFilter,
  cosineSimilarity,
  normalizeVector,
  QdrantService,
  validateProductVector,
  validateQdrantConfig,
  validateSearchOptions,
} from './qdrant.service.js';

function createConfig(overrides: Partial<QdrantConfig> = {}): QdrantConfig {
  return {
    url: 'http://localhost:6333',
    collectionName: 'products',
    vectorSize: 3,
    distanceMetric: 'Cosine',
    ...overrides,
  };
}

function createProduct(overrides: Partial<ProductVector> = {}): ProductVector {
  return {
    productId: 'product-1',
    vector: [3, 4, 0],
    payload: {
      name: 'Water Shader Pack',
      creatorId: 'creator-1',
      categoryId: 'category-shaders',
      tags: ['unity', 'water'],
      price: 25,
      salesCount: 10,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

function createService(overrides: {
  client?: object;
  config?: QdrantConfig;
} = {}): QdrantService {
  return new QdrantService({
    config: overrides.config ?? createConfig(),
    client: (overrides.client ?? {
      collectionExists: vi.fn(async () => ({ exists: true })),
      createCollection: vi.fn(async () => true),
      upsert: vi.fn(async () => ({ status: 'completed' })),
      search: vi.fn(async () => []),
      retrieve: vi.fn(async () => []),
      delete: vi.fn(async () => ({ status: 'completed' })),
      getCollection: vi.fn(async () => ({ status: 'green', points_count: 0 })),
    }) as never,
  });
}

describe('buildQdrantFilter', () => {
  it('builds must and mustNot clauses from discovery options', () => {
    expect(
      buildQdrantFilter({
        excludeIds: ['product-1', 'product-2'],
        categoryId: 'category-shaders',
        minPrice: 10,
        maxPrice: 50,
      }),
    ).toEqual({
      must: [
        { key: 'categoryId', match: { value: 'category-shaders' } },
        { key: 'price', range: { gte: 10, lte: 50 } },
      ],
      mustNot: [
        { key: 'productId', match: { value: 'product-1' } },
        { key: 'productId', match: { value: 'product-2' } },
      ],
    });
  });

  it('returns an empty filter when no options are provided', () => {
    expect(buildQdrantFilter({})).toEqual({});
  });
});

describe('normalizeVector', () => {
  it('returns a unit vector', () => {
    const normalized = normalizeVector([3, 4, 0]);
    const magnitude = Math.sqrt(
      normalized.reduce((sum, value) => sum + value * value, 0),
    );

    expect(magnitude).toBeCloseTo(1, 10);
    expect(normalized).toEqual([0.6, 0.8, 0]);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });
});

describe('validation', () => {
  it('rejects an invalid Qdrant config', () => {
    expect(() =>
      validateQdrantConfig(
        createConfig({
          url: '',
          collectionName: '',
          vectorSize: 0,
        }),
      ),
    ).toThrow(/Qdrant config/i);
  });

  it('rejects invalid search options', () => {
    const invalid: SearchOptions = {
      vector: [1, 2],
      limit: 0,
      scoreThreshold: 1.5,
    };

    expect(() => validateSearchOptions(invalid, 3)).toThrow(
      /limit|threshold|vector/i,
    );
  });

  it('rejects product vectors that do not match the configured size', () => {
    expect(() =>
      validateProductVector(createProduct({ vector: [1, 2] }), 3),
    ).toThrow(/vector size/i);
  });
});

describe('QdrantService', () => {
  it('creates the collection when it does not exist', async () => {
    const client = {
      collectionExists: vi.fn(async () => ({ exists: false })),
      createCollection: vi.fn(async () => true),
      upsert: vi.fn(async () => ({ status: 'completed' })),
      search: vi.fn(async () => []),
      retrieve: vi.fn(async () => []),
      delete: vi.fn(async () => ({ status: 'completed' })),
      getCollection: vi.fn(async () => ({ status: 'green', points_count: 0 })),
    };

    const service = createService({ client });
    await service.ensureCollection();

    expect(client.collectionExists).toHaveBeenCalledWith('products');
    expect(client.createCollection).toHaveBeenCalledWith('products', {
      vectors: { size: 3, distance: 'Cosine' },
    });
  });

  it('normalizes cosine vectors before upsert and stores a productId payload field', async () => {
    const client = {
      collectionExists: vi.fn(async () => ({ exists: true })),
      createCollection: vi.fn(async () => true),
      upsert: vi.fn(async () => ({ status: 'completed' })),
      search: vi.fn(async () => []),
      retrieve: vi.fn(async () => []),
      delete: vi.fn(async () => ({ status: 'completed' })),
      getCollection: vi.fn(async () => ({ status: 'green', points_count: 0 })),
    };

    const service = createService({ client });
    await service.upsertProduct(createProduct());

    expect(client.upsert).toHaveBeenCalledWith('products', {
      wait: true,
      points: [
        {
          id: 'product-1',
          vector: [0.6, 0.8, 0],
          payload: expect.objectContaining({
            productId: 'product-1',
            categoryId: 'category-shaders',
          }),
        },
      ],
    });
  });

  it('passes filters and thresholds to similarity search', async () => {
    const client = {
      collectionExists: vi.fn(async () => ({ exists: true })),
      createCollection: vi.fn(async () => true),
      upsert: vi.fn(async () => ({ status: 'completed' })),
      search: vi.fn(async () => [
        {
          id: 'product-2',
          version: 1,
          score: 0.92,
          payload: { name: 'Stylized Water', categoryId: 'category-shaders' },
        },
      ]),
      retrieve: vi.fn(async () => []),
      delete: vi.fn(async () => ({ status: 'completed' })),
      getCollection: vi.fn(async () => ({ status: 'green', points_count: 0 })),
    };

    const service = createService({ client });
    const results = await service.searchSimilar({
      vector: [3, 4, 0],
      limit: 5,
      scoreThreshold: 0.7,
      filter: buildQdrantFilter({
        excludeIds: ['product-1'],
        categoryId: 'category-shaders',
      }),
    });

    expect(client.search).toHaveBeenCalledWith('products', {
      vector: [0.6, 0.8, 0],
      limit: 5,
      score_threshold: 0.7,
      filter: {
        must: [{ key: 'categoryId', match: { value: 'category-shaders' } }],
        must_not: [{ key: 'productId', match: { value: 'product-1' } }],
      },
      with_payload: true,
      with_vector: false,
    });
    expect(results).toEqual([
      {
        productId: 'product-2',
        score: 0.92,
        payload: { name: 'Stylized Water', categoryId: 'category-shaders' },
      },
    ]);
  });

  it('retrieves and maps a stored product vector', async () => {
    const client = {
      collectionExists: vi.fn(async () => ({ exists: true })),
      createCollection: vi.fn(async () => true),
      upsert: vi.fn(async () => ({ status: 'completed' })),
      search: vi.fn(async () => []),
      retrieve: vi.fn(async () => [
        {
          id: 'product-1',
          payload: {
            productId: 'product-1',
            name: 'Water Shader Pack',
            creatorId: 'creator-1',
            categoryId: 'category-shaders',
            tags: ['unity', 'water'],
            price: 25,
            salesCount: 10,
            createdAt: '2025-01-01T00:00:00.000Z',
          },
          vector: [0.6, 0.8, 0],
        },
      ]),
      delete: vi.fn(async () => ({ status: 'completed' })),
      getCollection: vi.fn(async () => ({ status: 'green', points_count: 0 })),
    };

    const service = createService({ client });

    await expect(service.getProductVector('product-1')).resolves.toEqual({
      productId: 'product-1',
      vector: [0.6, 0.8, 0],
      payload: {
        name: 'Water Shader Pack',
        creatorId: 'creator-1',
        categoryId: 'category-shaders',
        tags: ['unity', 'water'],
        price: 25,
        salesCount: 10,
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    });
  });

  it('returns collection status and vector count', async () => {
    const service = createService({
      client: {
        collectionExists: vi.fn(async () => ({ exists: true })),
        createCollection: vi.fn(async () => true),
        upsert: vi.fn(async () => ({ status: 'completed' })),
        search: vi.fn(async () => []),
        retrieve: vi.fn(async () => []),
        delete: vi.fn(async () => ({ status: 'completed' })),
        getCollection: vi.fn(async () => ({
          status: 'green',
          points_count: 42,
          indexed_vectors_count: 40,
        })),
      },
    });

    await expect(service.collectionInfo()).resolves.toEqual({
      vectorCount: 42,
      status: 'green',
    });
  });
});

describe('QdrantCandidateSource', () => {
  it('returns scored pipeline candidates from similar products', async () => {
    const searchSimilar = vi.fn(async () => [
      {
        productId: 'product-2',
        score: 0.88,
        payload: { categoryId: 'category-shaders' },
      },
    ]);
    const resolveUserVector = vi.fn(async () => [3, 4, 0]);
    const source = new QdrantCandidateSource({
      qdrantService: { searchSimilar },
      resolveUserVector,
      scoreThreshold: 0.5,
    });
    const context: PipelineContext = {
      userId: 'user-1',
      limit: 5,
      excludeProductIds: ['product-1'],
    };

    const candidates = await source.getCandidates('user-1', context);

    expect(resolveUserVector).toHaveBeenCalledWith('user-1', context);
    expect(searchSimilar).toHaveBeenCalledWith({
      vector: [3, 4, 0],
      limit: 5,
      scoreThreshold: 0.5,
      filter: {
        mustNot: [{ key: 'productId', match: { value: 'product-1' } }],
      },
    });
    expect(candidates).toEqual([
      {
        productId: 'product-2',
        source: 'qdrant',
        score: 0.88,
        metadata: {
          qdrantScore: 0.88,
          payload: { categoryId: 'category-shaders' },
        },
      },
    ]);
  });

  it('returns no candidates when the user vector cannot be resolved', async () => {
    const searchSimilar = vi.fn(async () => []);
    const source = new QdrantCandidateSource({
      qdrantService: { searchSimilar },
      resolveUserVector: vi.fn(async () => undefined),
    });

    await expect(
      source.getCandidates('user-1', { userId: 'user-1', limit: 3 }),
    ).resolves.toEqual([]);
    expect(searchSimilar).not.toHaveBeenCalled();
  });
});
