/**
 * Purpose: Verify featured-product collection contracts, API response validation,
 * and REST client request construction for the PayloadCMS editorial integration.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://payloadcms.com/docs
 *   - https://github.com/payloadcms/payload
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/#create-spans
 * Tests:
 *   - packages/editorial/tests/featured-products.test.ts
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditorialClient } from '../src/client.js';
import { featuredProductsCollection } from '../src/collections/featured-products.js';
import {
  isFeaturedProduct,
  parseDocumentResponse,
  parsePaginatedCollectionResponse,
} from '../src/guards.js';

describe('featuredProductsCollection', () => {
  it('defines the editorial featured-product fields and scheduling metadata', () => {
    expect(featuredProductsCollection.slug).toBe('featured-products');

    const productIdField = featuredProductsCollection.fields.find(
      (field) => field.name === 'productId',
    );
    expect(productIdField).toMatchObject({ type: 'text', required: true });

    const priorityField = featuredProductsCollection.fields.find((field) => field.name === 'priority');
    expect(priorityField).toMatchObject({ type: 'number', required: true, min: 1, max: 100 });

    const heroImageField = featuredProductsCollection.fields.find((field) => field.name === 'heroImage');
    expect(heroImageField).toMatchObject({ type: 'upload', relationTo: 'media' });

    const startDateField = featuredProductsCollection.fields.find(
      (field) => field.name === 'startDate',
    );
    const endDateField = featuredProductsCollection.fields.find((field) => field.name === 'endDate');

    expect(startDateField).toMatchObject({ type: 'date' });
    expect(endDateField).toMatchObject({ type: 'date' });
  });
});

describe('featured product guards', () => {
  const validFeaturedProduct = {
    id: 'featured-1',
    productId: 'vendure-123',
    displayTitle: 'Hero Product',
    displayDescription: 'Featured for launch day.',
    heroImage: {
      id: 'media-2',
      url: '/media/featured.jpg',
      filename: 'featured.jpg',
    },
    priority: 2,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-01-31T23:59:59.999Z',
  };

  it('accepts valid featured-product payloads', () => {
    expect(isFeaturedProduct(validFeaturedProduct)).toBe(true);
  });

  it('rejects malformed featured-product payloads', () => {
    expect(
      isFeaturedProduct({
        ...validFeaturedProduct,
        priority: 200,
      }),
    ).toBe(false);
  });

  it('parses individual Payload documents', () => {
    const product = parseDocumentResponse(validFeaturedProduct, isFeaturedProduct, 'featured-products');
    expect(product.productId).toBe('vendure-123');
  });

  it('parses paginated Payload responses', () => {
    const response = parsePaginatedCollectionResponse(
      {
        docs: [validFeaturedProduct],
        hasNextPage: false,
        hasPrevPage: false,
        limit: 10,
        page: 1,
        pagingCounter: 1,
        totalDocs: 1,
        totalPages: 1,
      },
      isFeaturedProduct,
      'featured-products',
    );

    expect(response.docs[0]?.priority).toBe(2);
  });
});

describe('EditorialClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds Payload REST requests for published article queries', async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          docs: [],
          hasNextPage: false,
          hasPrevPage: false,
          limit: 3,
          page: 1,
          pagingCounter: 1,
          totalDocs: 0,
          totalPages: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const client = new EditorialClient('https://cms.example.com/', { fetcher });
    await client.getPublishedArticles({ section: 'today', limit: 3 });

    expect(fetcher).toHaveBeenCalledTimes(1);

    const [url] = fetcher.mock.calls[0] ?? [];
    const parsedUrl = new URL(String(url));

    expect(parsedUrl.toString()).toContain('/api/articles');
    expect(parsedUrl.searchParams.get('depth')).toBe('2');
    expect(parsedUrl.searchParams.get('limit')).toBe('3');
    expect(parsedUrl.searchParams.get('sort')).toBe('-publishedAt');
    expect(parsedUrl.searchParams.get('where')).toBe(
      JSON.stringify({
        and: [
          { status: { equals: 'published' } },
          { section: { equals: 'today' } },
        ],
      }),
    );
  });

  it('queries sections from the generated editorial-sections REST endpoint', async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          docs: [],
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10,
          page: 1,
          pagingCounter: 1,
          totalDocs: 0,
          totalPages: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const client = new EditorialClient('https://cms.example.com', { fetcher });
    await client.getTodaySections();

    const [url] = fetcher.mock.calls[0] ?? [];
    const parsedUrl = new URL(String(url));

    expect(parsedUrl.pathname).toBe('/api/editorial-sections');
    expect(parsedUrl.searchParams.get('sort')).toBe('sortOrder');
    expect(parsedUrl.searchParams.get('where')).toBe(
      JSON.stringify({ isActive: { equals: true } }),
    );
  });

  it('fetches article-by-slug using the articles collection endpoint', async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          docs: [],
          hasNextPage: false,
          hasPrevPage: false,
          limit: 1,
          page: 1,
          pagingCounter: 1,
          totalDocs: 0,
          totalPages: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const client = new EditorialClient('https://cms.example.com', { fetcher });
    await client.getArticleBySlug('launch-day');

    const [url] = fetcher.mock.calls[0] ?? [];
    const parsedUrl = new URL(String(url));

    expect(parsedUrl.pathname).toBe('/api/articles');
    expect(parsedUrl.searchParams.get('limit')).toBe('1');
    expect(parsedUrl.searchParams.get('where')).toBe(
      JSON.stringify({
        and: [
          { slug: { equals: 'launch-day' } },
          { status: { equals: 'published' } },
        ],
      }),
    );
  });

  it('resolves featured products for a section via published articles in that section', async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          docs: [
            {
              id: 'article-1',
              title: 'Launch Day',
              slug: 'launch-day',
              excerpt: 'Short summary',
              content: { root: { children: [] } },
              heroImage: { id: 'media-1', url: '/media/hero.jpg', filename: 'hero.jpg' },
              author: 'Editorial Team',
              publishedAt: '2026-01-02T00:00:00.000Z',
              status: 'published',
              tags: [],
              featuredProducts: [
                {
                  id: 'featured-2',
                  productId: 'vendure-456',
                  priority: 1,
                },
                {
                  id: 'featured-1',
                  productId: 'vendure-123',
                  priority: 3,
                },
              ],
            },
          ],
          hasNextPage: false,
          hasPrevPage: false,
          limit: 100,
          page: 1,
          pagingCounter: 1,
          totalDocs: 1,
          totalPages: 1,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const client = new EditorialClient('https://cms.example.com', { fetcher });
    const featuredProducts = await client.getFeaturedProducts('section-123');

    expect(featuredProducts.map((product) => product.id)).toEqual(['featured-2', 'featured-1']);

    const [url] = fetcher.mock.calls[0] ?? [];
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.pathname).toBe('/api/articles');
    expect(parsedUrl.searchParams.get('where')).toBe(
      JSON.stringify({
        and: [
          { status: { equals: 'published' } },
          { section: { equals: 'section-123' } },
        ],
      }),
    );
  });
});
