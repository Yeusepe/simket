/**
 * Purpose: Typesense-backed search indexer for published editorial articles.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership, §9 Every outbound call through Cockatiel)
 *   - docs/service-architecture.md (§1.5 PayloadCMS API, §1.8 Typesense)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://typesense.org/docs/27.1/api/collections.html
 *   - https://typesense.org/docs/27.1/api/documents.html
 *   - packages/vendure-server/src/plugins/search/typesense.ts
 * Tests:
 *   - packages/vendure-server/src/features/editorial/editorial-sync.service.test.ts
 */
import { trace, SpanStatusCode, type Tracer } from '@opentelemetry/api';
import type { BaseCollectionCreateSchema, Client, CollectionFieldSchema } from 'typesense';
import { SERVICE_POLICIES, type ResiliencePolicy } from '../../resilience/resilience.js';
import { buildTypesenseConfig, createTypesenseClient } from '../../plugins/search/typesense.js';
import type { EditorialArticleSearchDocument } from './editorial.types.js';

type EditorialTypesenseClient = Pick<Client, 'collections'>;
type ConcreteCollectionCreateSchema = BaseCollectionCreateSchema & {
  fields: CollectionFieldSchema[];
};

export interface EditorialArticleIndexer {
  upsert(document: EditorialArticleSearchDocument): Promise<void>;
  delete(documentId: string): Promise<void>;
}

export const EDITORIAL_ARTICLES_COLLECTION = 'editorial_articles';

export const EDITORIAL_ARTICLES_SCHEMA: ConcreteCollectionCreateSchema = {
  name: EDITORIAL_ARTICLES_COLLECTION,
  fields: [
    { name: 'title', type: 'string' },
    { name: 'excerpt', type: 'string', optional: true },
    { name: 'author', type: 'string', optional: true },
    { name: 'tags', type: 'string[]', facet: true },
    { name: 'publishedAt', type: 'int64' },
    { name: 'sectionId', type: 'string', optional: true, facet: true },
    { name: 'slug', type: 'string', index: false },
  ] satisfies CollectionFieldSchema[],
  default_sorting_field: 'publishedAt',
};

interface TypesenseEditorialArticleIndexerOptions {
  readonly client?: EditorialTypesenseClient;
  readonly tracer?: Tracer;
  readonly policy?: ResiliencePolicy;
}

export class TypesenseEditorialArticleIndexer implements EditorialArticleIndexer {
  private readonly client: EditorialTypesenseClient;

  private readonly tracer: Tracer;

  private readonly policy: ResiliencePolicy;

  private collectionEnsured = false;

  constructor(options: TypesenseEditorialArticleIndexerOptions = {}) {
    this.client = options.client ?? createTypesenseClient(buildTypesenseConfig());
    this.tracer = options.tracer ?? trace.getTracer('simket-editorial-indexer');
    this.policy = options.policy ?? SERVICE_POLICIES.typesense;
  }

  async upsert(document: EditorialArticleSearchDocument): Promise<void> {
    await this.ensureCollection();

    await this.tracer.startActiveSpan('editorial.indexer.upsert', async (span) => {
      span.setAttributes({
        'editorial.article_id': document.id,
        'editorial.slug': document.slug,
      });

      try {
        await this.policy.execute(() =>
          this.client
            .collections<EditorialArticleSearchDocument>(EDITORIAL_ARTICLES_COLLECTION)
            .documents()
            .upsert(document),
        );
      } catch (error) {
        markSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async delete(documentId: string): Promise<void> {
    await this.ensureCollection();

    await this.tracer.startActiveSpan('editorial.indexer.delete', async (span) => {
      span.setAttribute('editorial.article_id', documentId);

      try {
        await this.policy.execute(() =>
          this.client
            .collections<EditorialArticleSearchDocument>(EDITORIAL_ARTICLES_COLLECTION)
            .documents(documentId)
            .delete(),
        );
      } catch (error) {
        if (isObjectNotFound(error)) {
          return;
        }

        markSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async ensureCollection(): Promise<void> {
    if (this.collectionEnsured) {
      return;
    }

    await this.tracer.startActiveSpan('editorial.indexer.ensureCollection', async (span) => {
      try {
        await this.policy.execute(() =>
          this.client.collections(EDITORIAL_ARTICLES_COLLECTION).retrieve(),
        );
      } catch (error) {
        if (!isObjectNotFound(error)) {
          markSpanError(span, error);
          throw error;
        }

        await this.policy.execute(() => this.client.collections().create(EDITORIAL_ARTICLES_SCHEMA));
      } finally {
        span.end();
      }
    });

    this.collectionEnsured = true;
  }
}

function isObjectNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'httpStatus' in error && (error as { httpStatus: number }).httpStatus === 404);
}

function markSpanError(span: import('@opentelemetry/api').Span, error: unknown): void {
  span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
}
