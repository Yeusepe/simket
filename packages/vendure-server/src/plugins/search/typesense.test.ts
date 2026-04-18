import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PRODUCTS_COLLECTION,
  PRODUCTS_SCHEMA,
  buildTypesenseConfig,
  createTypesenseClient,
  ensureProductsCollection,
  checkTypesenseHealth,
} from './typesense.js';
import type { TypesenseConfig, ProductDocument } from './typesense.js';

/**
 * Tests for Typesense search integration module.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://typesense.org/docs/27.1/api/collections.html
 *   - https://github.com/typesense/typesense-js
 */

describe('Typesense search module', () => {
  // ─── Schema constants ───

  describe('PRODUCTS_COLLECTION', () => {
    it('should be named "products"', () => {
      expect(PRODUCTS_COLLECTION).toBe('products');
    });
  });

  describe('PRODUCTS_SCHEMA', () => {
    it('should have name matching PRODUCTS_COLLECTION', () => {
      expect(PRODUCTS_SCHEMA.name).toBe(PRODUCTS_COLLECTION);
    });

    it('should have default_sorting_field set to createdAt', () => {
      expect(PRODUCTS_SCHEMA.default_sorting_field).toBe('createdAt');
    });

    it('should have enable_nested_fields disabled', () => {
      expect(PRODUCTS_SCHEMA.enable_nested_fields).toBe(false);
    });

    it('should define all required fields', () => {
      const fieldNames = PRODUCTS_SCHEMA.fields.map((f) => f.name);
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('description');
      expect(fieldNames).toContain('tags');
      expect(fieldNames).toContain('categoryIds');
      expect(fieldNames).toContain('priceInCents');
      expect(fieldNames).toContain('platformTakeRate');
      expect(fieldNames).toContain('createdAt');
      expect(fieldNames).toContain('popularityScore');
      expect(fieldNames).toContain('heroAssetId');
      expect(fieldNames).toContain('creatorName');
      expect(fieldNames).toContain('slug');
      expect(fieldNames).toContain('vendureProductId');
    });

    it('should have exactly 12 fields', () => {
      expect(PRODUCTS_SCHEMA.fields).toHaveLength(12);
    });

    // ─── Searchable fields ───

    describe('searchable fields', () => {
      it('title should be string type, not optional', () => {
        const field = PRODUCTS_SCHEMA.fields.find((f) => f.name === 'title');
        expect(field).toBeDefined();
        expect(field!.type).toBe('string');
        expect(field!.optional).toBeUndefined();
      });

      it('description should be string type, optional', () => {
        const field = PRODUCTS_SCHEMA.fields.find((f) => f.name === 'description');
        expect(field).toBeDefined();
        expect(field!.type).toBe('string');
        expect(field!.optional).toBe(true);
      });

      it('tags should be string[] type with facet enabled', () => {
        const field = PRODUCTS_SCHEMA.fields.find((f) => f.name === 'tags');
        expect(field).toBeDefined();
        expect(field!.type).toBe('string[]');
        expect(field!.facet).toBe(true);
      });
    });

    // ─── Filterable fields ───

    describe('filterable fields', () => {
      it('categoryIds should be string[] with facet', () => {
        const field = PRODUCTS_SCHEMA.fields.find((f) => f.name === 'categoryIds');
        expect(field).toBeDefined();
        expect(field!.type).toBe('string[]');
        expect(field!.facet).toBe(true);
      });

      it('priceInCents should be int32 with facet', () => {
        const field = PRODUCTS_SCHEMA.fields.find((f) => f.name === 'priceInCents');
        expect(field).toBeDefined();
        expect(field!.type).toBe('int32');
        expect(field!.facet).toBe(true);
      });

      it('platformTakeRate should be int32 without facet', () => {
        const field = PRODUCTS_SCHEMA.fields.find((f) => f.name === 'platformTakeRate');
        expect(field).toBeDefined();
        expect(field!.type).toBe('int32');
        expect(field!.facet).toBe(false);
      });
    });

    // ─── Sortable fields ───

    describe('sortable fields', () => {
      it('createdAt should be int64', () => {
        const field = PRODUCTS_SCHEMA.fields.find((f) => f.name === 'createdAt');
        expect(field).toBeDefined();
        expect(field!.type).toBe('int64');
      });

      it('popularityScore should be int32, optional', () => {
        const field = PRODUCTS_SCHEMA.fields.find((f) => f.name === 'popularityScore');
        expect(field).toBeDefined();
        expect(field!.type).toBe('int32');
        expect(field!.optional).toBe(true);
      });
    });

    // ─── Display-only fields ───

    describe('display-only fields', () => {
      it('heroAssetId should be unindexed and optional', () => {
        const field = PRODUCTS_SCHEMA.fields.find((f) => f.name === 'heroAssetId');
        expect(field).toBeDefined();
        expect(field!.index).toBe(false);
        expect(field!.optional).toBe(true);
      });

      it('slug should be unindexed', () => {
        const field = PRODUCTS_SCHEMA.fields.find((f) => f.name === 'slug');
        expect(field).toBeDefined();
        expect(field!.index).toBe(false);
      });
    });
  });

  // ─── Config builder ───

  describe('buildTypesenseConfig', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    it('should return default config when no env vars set', () => {
      delete process.env['TYPESENSE_NODES'];
      delete process.env['TYPESENSE_PROTOCOL'];
      delete process.env['TYPESENSE_API_KEY'];

      const config = buildTypesenseConfig();
      expect(config.nodes).toHaveLength(1);
      expect(config.nodes[0]!.host).toBe('localhost');
      expect(config.nodes[0]!.port).toBe(8108);
      expect(config.nodes[0]!.protocol).toBe('http');
      expect(config.apiKey).toBe('simket_dev_key');
      expect(config.connectionTimeoutSeconds).toBe(5);
    });

    it('should parse multiple comma-separated nodes', () => {
      process.env['TYPESENSE_NODES'] = 'ts1.example.com:8108,ts2.example.com:8108,ts3.example.com:8108';
      process.env['TYPESENSE_PROTOCOL'] = 'https';
      process.env['TYPESENSE_API_KEY'] = 'prod_key_123';

      const config = buildTypesenseConfig();
      expect(config.nodes).toHaveLength(3);
      expect(config.nodes[0]!.host).toBe('ts1.example.com');
      expect(config.nodes[1]!.host).toBe('ts2.example.com');
      expect(config.nodes[2]!.host).toBe('ts3.example.com');
      expect(config.nodes[0]!.protocol).toBe('https');
      expect(config.apiKey).toBe('prod_key_123');
    });

    it('should handle single node without port', () => {
      process.env['TYPESENSE_NODES'] = 'search.local';
      delete process.env['TYPESENSE_PROTOCOL'];
      delete process.env['TYPESENSE_API_KEY'];

      const config = buildTypesenseConfig();
      expect(config.nodes).toHaveLength(1);
      expect(config.nodes[0]!.host).toBe('search.local');
      expect(config.nodes[0]!.port).toBe(8108);
    });
  });

  // ─── Client creation ───

  describe('createTypesenseClient', () => {
    it('should return a Typesense Client instance', () => {
      const config: TypesenseConfig = {
        nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
        apiKey: 'test_key',
      };
      const client = createTypesenseClient(config);
      expect(client).toBeDefined();
      expect(client.collections).toBeDefined();
      expect(client.health).toBeDefined();
    });

    it('should apply default timeout values when not specified', () => {
      const config: TypesenseConfig = {
        nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
        apiKey: 'test_key',
      };
      const client = createTypesenseClient(config);
      expect(client.configuration.connectionTimeoutSeconds).toBe(5);
    });

    it('should respect custom timeout values', () => {
      const config: TypesenseConfig = {
        nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
        apiKey: 'test_key',
        connectionTimeoutSeconds: 10,
        retryIntervalSeconds: 0.5,
        numRetries: 5,
      };
      const client = createTypesenseClient(config);
      expect(client.configuration.connectionTimeoutSeconds).toBe(10);
      expect(client.configuration.retryIntervalSeconds).toBe(0.5);
      expect(client.configuration.numRetries).toBe(5);
    });
  });

  // ─── ensureProductsCollection ───

  describe('ensureProductsCollection', () => {
    it('should not create collection if it already exists', async () => {
      const mockRetrieve = vi.fn().mockResolvedValue({ name: 'products' });
      const mockCreate = vi.fn();
      const mockClient = {
        collections: vi.fn((name?: string) => {
          if (name) return { retrieve: mockRetrieve };
          return { create: mockCreate };
        }),
      } as unknown as ReturnType<typeof createTypesenseClient>;

      await ensureProductsCollection(mockClient);

      expect(mockRetrieve).toHaveBeenCalledOnce();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should create collection if it does not exist (404)', async () => {
      const mockRetrieve = vi.fn().mockRejectedValue({ httpStatus: 404 });
      const mockCreate = vi.fn().mockResolvedValue({ name: 'products' });
      const mockClient = {
        collections: vi.fn((name?: string) => {
          if (name) return { retrieve: mockRetrieve };
          return { create: mockCreate };
        }),
      } as unknown as ReturnType<typeof createTypesenseClient>;

      await ensureProductsCollection(mockClient);

      expect(mockRetrieve).toHaveBeenCalledOnce();
      expect(mockCreate).toHaveBeenCalledWith(PRODUCTS_SCHEMA);
    });

    it('should rethrow non-404 errors', async () => {
      const serverError = { httpStatus: 500, message: 'Internal error' };
      const mockRetrieve = vi.fn().mockRejectedValue(serverError);
      const mockClient = {
        collections: vi.fn((name?: string) => {
          if (name) return { retrieve: mockRetrieve };
          return { create: vi.fn() };
        }),
      } as unknown as ReturnType<typeof createTypesenseClient>;

      await expect(ensureProductsCollection(mockClient)).rejects.toEqual(serverError);
    });
  });

  // ─── checkTypesenseHealth ───

  describe('checkTypesenseHealth', () => {
    it('should return true when cluster is healthy', async () => {
      const mockClient = {
        health: { retrieve: vi.fn().mockResolvedValue({ ok: true }) },
      } as unknown as ReturnType<typeof createTypesenseClient>;

      const result = await checkTypesenseHealth(mockClient);
      expect(result).toBe(true);
    });

    it('should return false when cluster reports unhealthy', async () => {
      const mockClient = {
        health: { retrieve: vi.fn().mockResolvedValue({ ok: false }) },
      } as unknown as ReturnType<typeof createTypesenseClient>;

      const result = await checkTypesenseHealth(mockClient);
      expect(result).toBe(false);
    });

    it('should return false when health check throws', async () => {
      const mockClient = {
        health: { retrieve: vi.fn().mockRejectedValue(new Error('Connection refused')) },
      } as unknown as ReturnType<typeof createTypesenseClient>;

      const result = await checkTypesenseHealth(mockClient);
      expect(result).toBe(false);
    });
  });

  // ─── ProductDocument type compliance ───

  describe('ProductDocument type', () => {
    it('should accept a valid complete document', () => {
      const doc: ProductDocument = {
        id: 'prod_123',
        title: 'Test Product',
        description: 'A test description',
        tags: ['game', 'indie'],
        categoryIds: ['cat_1'],
        priceInCents: 999,
        platformTakeRate: 10,
        createdAt: Date.now(),
        popularityScore: 42,
        heroAssetId: 'asset_abc',
        creatorName: 'TestCreator',
        slug: 'test-product',
        vendureProductId: 'vp_456',
      };
      expect(doc.id).toBe('prod_123');
      expect(doc.tags).toHaveLength(2);
    });

    it('should accept a minimal document (optional fields omitted)', () => {
      const doc: ProductDocument = {
        id: 'prod_min',
        title: 'Minimal',
        tags: [],
        categoryIds: [],
        priceInCents: 0,
        platformTakeRate: 5,
        createdAt: Date.now(),
        slug: 'minimal',
        vendureProductId: 'vp_min',
      };
      expect(doc.description).toBeUndefined();
      expect(doc.popularityScore).toBeUndefined();
      expect(doc.heroAssetId).toBeUndefined();
      expect(doc.creatorName).toBeUndefined();
    });
  });
});
