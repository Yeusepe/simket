/**
 * Purpose: Unit tests for the vendure-server editorial cache service.
 * Governing docs:
 *   - docs/architecture.md (§2 Cache-aside, §9 Every outbound call through Cockatiel)
 *   - docs/service-architecture.md (§1.5 PayloadCMS API)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://payloadcms.com/docs/rest-api/overview
 * Tests:
 *   - packages/vendure-server/src/features/editorial/editorial-cache.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type {
  Article,
  EditorialSection as PayloadEditorialSection,
  FeaturedProduct,
} from '@simket/editorial';
import { EditorialCacheService } from './editorial-cache.service.js';
import type { EditorialWebhookEvent } from './editorial.types.js';

class FakeRedisCacheService {
  readonly entries = new Map<string, unknown>();

  readonly deletedKeys: string[] = [];

  readonly deletedPatterns: string[] = [];

  async getOrSetSwr<T>(
    key: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    if (this.entries.has(key)) {
      return this.entries.get(key) as T;
    }

    const value = await factory();
    this.entries.set(key, value);
    return value;
  }

  async delete(key: string): Promise<boolean> {
    this.deletedKeys.push(key);
    return this.entries.delete(key);
  }

  async deletePattern(pattern: string): Promise<number> {
    this.deletedPatterns.push(pattern);
    return 0;
  }
}

function makeSection(
  overrides: Partial<PayloadEditorialSection> = {},
): PayloadEditorialSection {
  return {
    id: overrides.id ?? 'section-1',
    name: overrides.name ?? 'Featured',
    slug: overrides.slug ?? 'featured',
    description: overrides.description,
    layout: overrides.layout ?? 'card-grid-4',
    sortOrder: overrides.sortOrder ?? 1,
    isActive: overrides.isActive ?? true,
  };
}

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: overrides.id ?? 'article-1',
    title: overrides.title ?? 'Launch Day',
    slug: overrides.slug ?? 'launch-day',
    excerpt: overrides.excerpt ?? 'Short summary',
    content: overrides.content ?? { root: { children: [] } },
    heroImage: overrides.heroImage ?? {
      id: 'media-1',
      url: 'https://cdn.example.com/hero.jpg',
      filename: 'hero.jpg',
    },
    heroTransparent: overrides.heroTransparent,
    author: overrides.author ?? 'Editorial Team',
    publishedAt: overrides.publishedAt ?? '2026-01-02T00:00:00.000Z',
    status: overrides.status ?? 'published',
    tags: overrides.tags ?? ['launch'],
    featuredProducts: overrides.featuredProducts ?? [],
    section: overrides.section,
  };
}

function makeFeaturedProduct(overrides: Partial<FeaturedProduct> = {}): FeaturedProduct {
  return {
    id: overrides.id ?? 'featured-1',
    productId: overrides.productId ?? 'product-1',
    displayTitle: overrides.displayTitle,
    displayDescription: overrides.displayDescription,
    heroImage: overrides.heroImage,
    heroTransparent: overrides.heroTransparent,
    priority: overrides.priority ?? 1,
    startDate: overrides.startDate,
    endDate: overrides.endDate,
  };
}

describe('EditorialCacheService', () => {
  it('caches article lookups by slug', async () => {
    const cache = new FakeRedisCacheService();
    const editorialClient = {
      getArticleBySlug: vi.fn().mockResolvedValue(makeArticle()),
      getPublishedArticles: vi.fn(),
      getTodaySections: vi.fn(),
      getFeaturedProducts: vi.fn(),
    };
    const service = new EditorialCacheService(cache as never, editorialClient as never);

    const first = await service.getArticle('launch-day');
    const second = await service.getArticle('launch-day');

    expect(first?.slug).toBe('launch-day');
    expect(second?.slug).toBe('launch-day');
    expect(editorialClient.getArticleBySlug).toHaveBeenCalledTimes(1);
  });

  it('builds curated collections from active sections and published articles', async () => {
    const cache = new FakeRedisCacheService();
    const heroSection = makeSection({
      id: 'section-hero',
      name: 'Hero',
      slug: 'hero',
      layout: 'hero-banner',
      sortOrder: 2,
    });
    const gridSection = makeSection({
      id: 'section-grid',
      name: 'Grid',
      slug: 'grid',
      layout: 'card-grid-4',
      sortOrder: 1,
    });
    const editorialClient = {
      getArticleBySlug: vi.fn(),
      getTodaySections: vi.fn().mockResolvedValue([heroSection, gridSection]),
      getPublishedArticles: vi.fn().mockResolvedValue([
        makeArticle({
          id: 'article-grid',
          title: 'Grid Story',
          slug: 'grid-story',
          section: gridSection,
        }),
        makeArticle({
          id: 'article-hero',
          title: 'Hero Story',
          slug: 'hero-story',
          heroTransparent: {
            id: 'media-transparent',
            url: 'https://cdn.example.com/hero-transparent.png',
            filename: 'hero-transparent.png',
          },
          section: heroSection,
        }),
      ]),
      getFeaturedProducts: vi.fn().mockResolvedValue([
        makeFeaturedProduct({ productId: 'product-hero' }),
      ]),
    };
    const service = new EditorialCacheService(cache as never, editorialClient as never);

    const collections = await service.getCuratedCollections();

    expect(collections.map((collection) => collection.name)).toEqual(['Grid', 'Hero']);
    expect(collections[1]?.items[0]?.heroTransparent).toBe(
      'https://cdn.example.com/hero-transparent.png',
    );
    expect(collections[1]?.featuredProducts[0]?.productId).toBe('product-hero');
  });

  it('invalidates article and today cache keys for article webhooks', async () => {
    const cache = new FakeRedisCacheService();
    const editorialClient = {
      getArticleBySlug: vi.fn(),
      getTodaySections: vi.fn(),
      getPublishedArticles: vi.fn(),
      getFeaturedProducts: vi.fn(),
    };
    const service = new EditorialCacheService(cache as never, editorialClient as never);
    const event: EditorialWebhookEvent = {
      eventId: 'evt-1',
      collection: 'articles',
      operation: 'update',
      occurredAt: '2026-01-02T00:00:00.000Z',
      doc: {
        id: 'article-1',
        slug: 'launch-day',
        sectionId: 'section-1',
        status: 'published',
      },
      previousDoc: {
        id: 'article-1',
        slug: 'launch-day-old',
        sectionId: 'section-2',
        status: 'draft',
      },
    };

    await service.invalidateForWebhook(event);

    expect(cache.deletedKeys).toEqual(
      expect.arrayContaining([
        'editorial:article:launch-day',
        'editorial:article:launch-day-old',
        'editorial:curated-collections',
      ]),
    );
    expect(cache.deletedPatterns).toEqual(
      expect.arrayContaining(['editorial:featured-products:*']),
    );
  });
});
