/**
 * Purpose: Unit tests for editorial sync, search indexing, and update emission.
 * Governing docs:
 *   - docs/architecture.md (§2 Idempotent by default, §9 Every outbound call through Cockatiel)
 *   - docs/service-architecture.md (§1.5 PayloadCMS API, §1.7 Svix)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://typesense.org/docs/27.1/api/documents.html
 *   - https://docs.svix.com/
 * Tests:
 *   - packages/vendure-server/src/features/editorial/editorial-sync.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import { EditorialSyncService } from './editorial-sync.service.js';
import type {
  CuratedCollection,
  EditorialArticleSearchDocument,
  EditorialWebhookEvent,
} from './editorial.types.js';

function makeCuratedCollection(
  overrides: Partial<CuratedCollection> = {},
): CuratedCollection {
  return {
    id: overrides.id ?? 'section-1',
    name: overrides.name ?? 'Featured',
    slug: overrides.slug ?? 'featured',
    layout: overrides.layout ?? 'card-grid-4',
    sortOrder: overrides.sortOrder ?? 1,
    items: overrides.items ?? [],
    featuredProducts: overrides.featuredProducts ?? [],
  };
}

function makeEvent(
  overrides: Partial<EditorialWebhookEvent> = {},
): EditorialWebhookEvent {
  return {
    eventId: overrides.eventId ?? 'evt-1',
    collection: overrides.collection ?? 'articles',
    operation: overrides.operation ?? 'update',
    occurredAt: overrides.occurredAt ?? '2026-01-02T00:00:00.000Z',
    doc: overrides.doc ?? {
      id: 'article-1',
      slug: 'launch-day',
      status: 'published',
      title: 'Launch Day',
      excerpt: 'Short summary',
      publishedAt: '2026-01-02T00:00:00.000Z',
      tags: ['launch'],
      sectionId: 'section-1',
    },
    previousDoc: overrides.previousDoc,
  };
}

describe('EditorialSyncService', () => {
  it('indexes published articles, refreshes the homepage feed, and fans out Svix updates', async () => {
    const homepageFeed = [makeCuratedCollection()];
    const cacheService = {
      invalidateForWebhook: vi.fn().mockResolvedValue(undefined),
      getArticle: vi.fn().mockResolvedValue({
        id: 'article-1',
        slug: 'launch-day',
        title: 'Launch Day',
        excerpt: 'Short summary',
        author: 'Editorial Team',
        publishedAt: '2026-01-02T00:00:00.000Z',
        tags: ['launch'],
        status: 'published',
      }),
      getCuratedCollections: vi.fn().mockResolvedValue(homepageFeed),
    };
    const articleIndexer = {
      upsert: vi.fn<[(EditorialArticleSearchDocument)], Promise<void>>().mockResolvedValue(undefined),
      delete: vi.fn<[string], Promise<void>>().mockResolvedValue(undefined),
    };
    const svixService = {
      sendEvent: vi.fn().mockResolvedValue({ id: 'msg_1' }),
    };
    const service = new EditorialSyncService(cacheService as never, {
      articleIndexer,
      svixService: svixService as never,
      now: () => new Date('2026-01-03T00:00:00.000Z'),
    });

    const update = await service.processWebhook(makeEvent());

    expect(cacheService.invalidateForWebhook).toHaveBeenCalledTimes(1);
    expect(cacheService.getArticle).toHaveBeenCalledWith('launch-day');
    expect(articleIndexer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'article-1',
        slug: 'launch-day',
        title: 'Launch Day',
      }),
    );
    expect(service.getHomepageFeed()).toEqual(homepageFeed);
    expect(service.getUpdateSince(0)).toMatchObject({
      hasUpdate: true,
      version: 1,
    });
    expect(update.version).toBe(1);
    expect(svixService.sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId: 'editorial',
        eventType: 'editorial.content.updated',
        idempotencyKey: 'evt-1',
      }),
    );
  });

  it('deletes indexed articles when they are removed or unpublished', async () => {
    const cacheService = {
      invalidateForWebhook: vi.fn().mockResolvedValue(undefined),
      getArticle: vi.fn(),
      getCuratedCollections: vi.fn().mockResolvedValue([]),
    };
    const articleIndexer = {
      upsert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const service = new EditorialSyncService(cacheService as never, {
      articleIndexer,
    });

    await service.processWebhook(
      makeEvent({
        operation: 'delete',
        doc: undefined,
        previousDoc: {
          id: 'article-1',
          slug: 'launch-day',
          status: 'published',
        },
      }),
    );

    expect(articleIndexer.delete).toHaveBeenCalledWith('article-1');
    expect(articleIndexer.upsert).not.toHaveBeenCalled();
  });

  it('notifies subscribers when a featured-products update refreshes the homepage feed', async () => {
    const cacheService = {
      invalidateForWebhook: vi.fn().mockResolvedValue(undefined),
      getArticle: vi.fn(),
      getCuratedCollections: vi.fn().mockResolvedValue([makeCuratedCollection({ id: 'refresh-1' })]),
    };
    const service = new EditorialSyncService(cacheService as never);
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    await service.processWebhook(
      makeEvent({
        collection: 'featured-products',
        operation: 'update',
        doc: { id: 'featured-1', sectionId: 'section-1' },
      }),
    );

    expect(cacheService.getCuratedCollections).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'featured-products',
        version: 1,
      }),
    );
    unsubscribe();
  });
});
