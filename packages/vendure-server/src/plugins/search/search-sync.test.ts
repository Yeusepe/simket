import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchProducts,
  upsertProduct,
  deleteProduct,
  bulkUpsertProducts,
  DEFAULT_QUERY_BY,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
} from './search-sync.js';
import { PRODUCTS_COLLECTION, PRODUCTS_SCHEMA } from './typesense.js';
import type { ProductDocument } from './typesense.js';
import type { SearchQuery } from './search-sync.js';

/**
 * Tests for SearchSyncPlugin, search, upsert, delete, and bulk operations.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://typesense.org/docs/27.1/api/documents.html
 *   - https://typesense.org/docs/27.1/api/search.html
 */

function makeSampleDoc(overrides: Partial<ProductDocument> = {}): ProductDocument {
  return {
    id: 'prod_1',
    title: 'Test Product',
    description: 'A test product description',
    tags: ['indie', 'game'],
    categoryIds: ['cat_1'],
    priceInCents: 999,
    platformTakeRate: 10,
    createdAt: 1700000000000,
    popularityScore: 50,
    heroAssetId: 'asset_hero',
    creatorName: 'TestCreator',
    slug: 'test-product',
    vendureProductId: 'vp_1',
    ...overrides,
  };
}

// Helper to build a mock Typesense client with configurable behaviors
function buildMockClient(overrides?: {
  searchResult?: unknown;
  upsertResult?: unknown;
  deleteResult?: unknown;
  importResult?: unknown[];
}) {
  const mockSearch = vi.fn().mockResolvedValue(
    overrides?.searchResult ?? {
      hits: [
        {
          document: makeSampleDoc(),
          text_match: 100,
          highlight: {},
          highlights: [
            { field: 'title', snippet: '<mark>Test</mark> Product', matched_tokens: ['Test'] },
          ],
        },
      ],
      found: 1,
      page: 1,
      search_time_ms: 5,
      facet_counts: [
        {
          field_name: 'tags',
          sampled: false,
          stats: {},
          counts: [{ value: 'indie', count: 1, highlighted: 'indie' }],
        },
      ],
    },
  );

  const mockUpsert = vi.fn().mockResolvedValue(
    overrides?.upsertResult ?? makeSampleDoc(),
  );

  const mockDocDelete = vi.fn().mockResolvedValue(
    overrides?.deleteResult ?? { id: 'prod_1' },
  );

  const mockImport = vi.fn().mockResolvedValue(
    overrides?.importResult ?? [{ success: true }],
  );

  const mockDocuments = vi.fn((docId?: string) => {
    if (docId) {
      return { delete: mockDocDelete };
    }
    return {
      search: mockSearch,
      upsert: mockUpsert,
      import: mockImport,
    };
  });

  const mockCollections = vi.fn((_name?: string) => ({
    documents: mockDocuments,
  }));

  return {
    client: { collections: mockCollections } as unknown as import('typesense').Client,
    mocks: { search: mockSearch, upsert: mockUpsert, docDelete: mockDocDelete, import: mockImport, collections: mockCollections, documents: mockDocuments },
  };
}

describe('Search sync module', () => {
  // ─── Constants ───

  describe('constants', () => {
    it('DEFAULT_QUERY_BY covers title, description, tags', () => {
      expect(DEFAULT_QUERY_BY).toBe('title,description,tags');
    });

    it('DEFAULT_PER_PAGE is 20', () => {
      expect(DEFAULT_PER_PAGE).toBe(20);
    });

    it('MAX_PER_PAGE is 100', () => {
      expect(MAX_PER_PAGE).toBe(100);
    });
  });

  // ─── searchProducts ───

  describe('searchProducts', () => {
    it('should pass query to Typesense with defaults', async () => {
      const { client, mocks } = buildMockClient();
      const query: SearchQuery = { q: 'test' };

      await searchProducts(client, query);

      expect(mocks.search).toHaveBeenCalledWith({
        q: 'test',
        query_by: DEFAULT_QUERY_BY,
        filter_by: undefined,
        sort_by: undefined,
        facet_by: undefined,
        page: 1,
        per_page: 20,
        typo_tokens_threshold: 1,
      });
    });

    it('should return mapped search results', async () => {
      const { client } = buildMockClient();
      const result = await searchProducts(client, { q: 'test' });

      expect(result.found).toBe(1);
      expect(result.page).toBe(1);
      expect(result.searchTimeMs).toBe(5);
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0]!.document.title).toBe('Test Product');
      expect(result.hits[0]!.textMatch).toBe(100);
    });

    it('should map highlights correctly', async () => {
      const { client } = buildMockClient();
      const result = await searchProducts(client, { q: 'test' });

      expect(result.hits[0]!.highlights).toHaveLength(1);
      expect(result.hits[0]!.highlights[0]!.field).toBe('title');
      expect(result.hits[0]!.highlights[0]!.snippet).toBe('<mark>Test</mark> Product');
    });

    it('should map facet counts', async () => {
      const { client } = buildMockClient();
      const result = await searchProducts(client, { q: 'test', facetBy: 'tags' });

      expect(result.facetCounts).toBeDefined();
      expect(result.facetCounts).toHaveLength(1);
      expect(result.facetCounts![0]!.fieldName).toBe('tags');
      expect(result.facetCounts![0]!.counts[0]!.value).toBe('indie');
    });

    it('should clamp perPage to MAX_PER_PAGE', async () => {
      const { client, mocks } = buildMockClient();
      await searchProducts(client, { q: 'test', perPage: 500 });

      expect(mocks.search).toHaveBeenCalledWith(
        expect.objectContaining({ per_page: MAX_PER_PAGE }),
      );
    });

    it('should pass custom filter and sort', async () => {
      const { client, mocks } = buildMockClient();
      await searchProducts(client, {
        q: '*',
        filterBy: 'priceInCents:>500',
        sortBy: 'createdAt:desc',
        page: 2,
      });

      expect(mocks.search).toHaveBeenCalledWith(
        expect.objectContaining({
          q: '*',
          filter_by: 'priceInCents:>500',
          sort_by: 'createdAt:desc',
          page: 2,
        }),
      );
    });

    it('should handle empty results', async () => {
      const { client } = buildMockClient({
        searchResult: { hits: [], found: 0, page: 1, search_time_ms: 1 },
      });

      const result = await searchProducts(client, { q: 'nonexistent' });
      expect(result.found).toBe(0);
      expect(result.hits).toHaveLength(0);
    });
  });

  // ─── upsertProduct ───

  describe('upsertProduct', () => {
    it('should call documents().upsert with the document', async () => {
      const { client, mocks } = buildMockClient();
      const doc = makeSampleDoc();

      const result = await upsertProduct(client, doc);

      expect(mocks.upsert).toHaveBeenCalledWith(doc);
      expect(result.id).toBe('prod_1');
    });
  });

  // ─── deleteProduct ───

  describe('deleteProduct', () => {
    it('should call document(id).delete()', async () => {
      const { client, mocks } = buildMockClient();

      await deleteProduct(client, 'prod_1');

      expect(mocks.documents).toHaveBeenCalledWith('prod_1');
      expect(mocks.docDelete).toHaveBeenCalled();
    });

    it('should silently handle 404 on delete', async () => {
      const mockDocDelete = vi.fn().mockRejectedValue({ httpStatus: 404 });
      const mockDocuments = vi.fn((docId?: string) => {
        if (docId) return { delete: mockDocDelete };
        return {};
      });
      const client = {
        collections: vi.fn(() => ({ documents: mockDocuments })),
      } as unknown as import('typesense').Client;

      await expect(deleteProduct(client, 'missing')).resolves.toBeUndefined();
    });

    it('should rethrow non-404 errors on delete', async () => {
      const serverError = { httpStatus: 500, message: 'Internal error' };
      const mockDocDelete = vi.fn().mockRejectedValue(serverError);
      const mockDocuments = vi.fn((docId?: string) => {
        if (docId) return { delete: mockDocDelete };
        return {};
      });
      const client = {
        collections: vi.fn(() => ({ documents: mockDocuments })),
      } as unknown as import('typesense').Client;

      await expect(deleteProduct(client, 'prod_1')).rejects.toEqual(serverError);
    });
  });

  // ─── bulkUpsertProducts ───

  describe('bulkUpsertProducts', () => {
    it('should return {0,0} for empty array', async () => {
      const { client, mocks } = buildMockClient();
      const result = await bulkUpsertProducts(client, []);
      expect(result).toEqual({ success: 0, failed: 0 });
      expect(mocks.import).not.toHaveBeenCalled();
    });

    it('should call import with upsert action', async () => {
      const docs = [makeSampleDoc(), makeSampleDoc({ id: 'prod_2', title: 'Second' })];
      const { client, mocks } = buildMockClient({
        importResult: [{ success: true }, { success: true }],
      });

      const result = await bulkUpsertProducts(client, docs);

      expect(mocks.import).toHaveBeenCalledWith(docs, { action: 'upsert' });
      expect(result).toEqual({ success: 2, failed: 0 });
    });

    it('should count failures correctly', async () => {
      const docs = [makeSampleDoc(), makeSampleDoc({ id: 'prod_2' })];
      const { client } = buildMockClient({
        importResult: [
          { success: true },
          { success: false, error: 'Bad document', code: 400 },
        ],
      });

      const result = await bulkUpsertProducts(client, docs);
      expect(result).toEqual({ success: 1, failed: 1 });
    });
  });
});
