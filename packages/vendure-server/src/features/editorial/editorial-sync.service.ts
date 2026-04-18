/**
 * Purpose: Synchronise editorial webhook mutations into local cache-backed
 * representations, search indexes, and storefront update notifications.
 * Governing docs:
 *   - docs/architecture.md (§2 Idempotent by default, §9 Every outbound call through Cockatiel)
 *   - docs/service-architecture.md (§1.5 PayloadCMS API, §1.7 Svix, §1.8 Typesense)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.svix.com/
 *   - https://typesense.org/docs/27.1/api/documents.html
 * Tests:
 *   - packages/vendure-server/src/features/editorial/editorial-sync.service.test.ts
 */
import { EventEmitter } from 'node:events';
import { trace, SpanStatusCode, type Tracer } from '@opentelemetry/api';
import type { Article } from '@simket/editorial';
import type { SendEventParams, SvixService } from '../svix/index.js';
import { EditorialCacheService } from './editorial-cache.service.js';
import {
  type EditorialArticleIndexer,
  TypesenseEditorialArticleIndexer,
} from './editorial-search-indexer.js';
import type {
  CuratedCollection,
  EditorialArticleSearchDocument,
  EditorialUpdate,
  EditorialUpdateStatus,
  EditorialWebhookDocument,
  EditorialWebhookEvent,
} from './editorial.types.js';

interface EditorialSyncServiceOptions {
  readonly articleIndexer?: EditorialArticleIndexer;
  readonly svixService?: Pick<SvixService, 'sendEvent'>;
  readonly now?: () => Date;
  readonly tracer?: Tracer;
}

type EditorialUpdateListener = (update: EditorialUpdate) => void;

export class EditorialSyncService {
  private readonly articleIndexer: EditorialArticleIndexer;

  private readonly svixService?: Pick<SvixService, 'sendEvent'>;

  private readonly now: () => Date;

  private readonly tracer: Tracer;

  private readonly emitter = new EventEmitter();

  private version = 0;

  private latestUpdate?: EditorialUpdate;

  private homepageFeed: readonly CuratedCollection[] = [];

  constructor(
    private readonly cacheService: Pick<
      EditorialCacheService,
      'getArticle' | 'getCuratedCollections' | 'invalidateForWebhook'
    >,
    options: EditorialSyncServiceOptions = {},
  ) {
    this.articleIndexer = options.articleIndexer ?? new TypesenseEditorialArticleIndexer();
    this.svixService = options.svixService;
    this.now = options.now ?? (() => new Date());
    this.tracer = options.tracer ?? trace.getTracer('simket-editorial-sync');
  }

  async processWebhook(event: EditorialWebhookEvent): Promise<EditorialUpdate> {
    return this.tracer.startActiveSpan('editorial.sync.processWebhook', async (span) => {
      span.setAttributes({
        'editorial.collection': event.collection,
        'editorial.operation': event.operation,
        'editorial.event_id': event.eventId,
      });

      try {
        const invalidation =
          (await this.cacheService.invalidateForWebhook(event)) ?? {
            keys: [],
            patterns: [],
          };

        if (event.collection === 'articles') {
          await this.syncArticleSearchDocument(event);
        }

        const homepageFeedUpdated = shouldRefreshHomepageFeed(event.collection);
        if (homepageFeedUpdated) {
          this.homepageFeed = await this.cacheService.getCuratedCollections();
        }

        const update: EditorialUpdate = {
          version: ++this.version,
          collection: event.collection,
          operation: event.operation,
          occurredAt: event.occurredAt,
          receivedAt: this.now().toISOString(),
          eventId: event.eventId,
          affectedKeys: invalidation.keys,
          affectedPatterns: invalidation.patterns,
          homepageFeedUpdated,
        };

        if (this.svixService) {
          const params: SendEventParams = {
            creatorId: 'editorial',
            eventType: 'editorial.content.updated',
            payload: update as unknown as Record<string, unknown>,
            idempotencyKey: event.eventId,
          };
          await this.svixService.sendEvent(params);
        }

        this.latestUpdate = update;
        this.emitter.emit('update', update);
        return update;
      } catch (error) {
        markSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  getHomepageFeed(): readonly CuratedCollection[] {
    return this.homepageFeed;
  }

  getUpdateSince(version: number): EditorialUpdateStatus {
    return {
      hasUpdate: Boolean(this.latestUpdate && this.latestUpdate.version > version),
      version: this.latestUpdate?.version ?? this.version,
      update: this.latestUpdate && this.latestUpdate.version > version ? this.latestUpdate : undefined,
    };
  }

  subscribe(listener: EditorialUpdateListener): () => void {
    this.emitter.on('update', listener);
    return () => {
      this.emitter.off('update', listener);
    };
  }

  private async syncArticleSearchDocument(event: EditorialWebhookEvent): Promise<void> {
    const current = event.doc;
    const previous = event.previousDoc;
    const documentId = current?.id ?? previous?.id;

    if (!documentId) {
      return;
    }

    if (shouldDeleteArticleDocument(event.operation, current, previous)) {
      await this.articleIndexer.delete(documentId);
      return;
    }

    if (!current?.slug) {
      return;
    }

    const article = await this.cacheService.getArticle(current.slug);
    if (!article || article.status !== 'published') {
      await this.articleIndexer.delete(documentId);
      return;
    }

    await this.articleIndexer.upsert(buildEditorialArticleSearchDocument(article));
  }
}

function shouldDeleteArticleDocument(
  operation: EditorialWebhookEvent['operation'],
  current?: EditorialWebhookDocument,
  previous?: EditorialWebhookDocument,
): boolean {
  if (operation === 'delete' || operation === 'unpublish') {
    return true;
  }

  const currentStatus = current?.status;
  const previousStatus = previous?.status;
  return (
    currentStatus === 'draft' ||
    currentStatus === 'archived' ||
    (previousStatus === 'published' && currentStatus !== 'published')
  );
}

function shouldRefreshHomepageFeed(collection: EditorialWebhookEvent['collection']): boolean {
  return collection === 'articles' || collection === 'editorial-sections' || collection === 'featured-products';
}

export function buildEditorialArticleSearchDocument(
  article: Pick<Article, 'author' | 'excerpt' | 'id' | 'publishedAt' | 'section' | 'slug' | 'tags' | 'title'>,
): EditorialArticleSearchDocument {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    author: article.author,
    publishedAt: new Date(article.publishedAt).getTime(),
    tags: article.tags,
    sectionId: article.section?.id,
  };
}

function markSpanError(span: import('@opentelemetry/api').Span, error: unknown): void {
  span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
}
