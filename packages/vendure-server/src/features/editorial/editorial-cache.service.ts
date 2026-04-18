/**
 * Purpose: Redis-backed editorial cache service that fronts PayloadCMS reads for
 * articles, featured products, and curated homepage collections.
 * Governing docs:
 *   - docs/architecture.md (§2 Cache-aside, delete-on-write; §9 Every outbound call through Cockatiel)
 *   - docs/service-architecture.md (§1.5 PayloadCMS API)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://payloadcms.com/docs/rest-api/overview
 *   - packages/editorial/src/client.ts
 * Tests:
 *   - packages/vendure-server/src/features/editorial/editorial-cache.service.test.ts
 */
import { trace, SpanStatusCode, type Tracer } from '@opentelemetry/api';
import type { Article, EditorialClient, FeaturedProduct } from '@simket/editorial';
import type { EditorialSection as PayloadEditorialSection } from '@simket/editorial';
import { editorialCacheKey, type RedisCacheService } from '../cache/index.js';
import type {
  CuratedCollection,
  CuratedCollectionItem,
  EditorialInvalidationResult,
  EditorialWebhookEvent,
} from './editorial.types.js';

type CacheClient = Pick<RedisCacheService, 'getOrSetSwr' | 'delete' | 'deletePattern'>;
type PayloadEditorialClient = Pick<
  EditorialClient,
  'getArticleBySlug' | 'getFeaturedProducts' | 'getPublishedArticles' | 'getTodaySections'
>;

interface EditorialCacheServiceOptions {
  readonly freshTtlSeconds?: number;
  readonly staleTtlSeconds?: number;
  readonly tracer?: Tracer;
}

const DEFAULT_FRESH_TTL_SECONDS = 60;
const DEFAULT_STALE_TTL_SECONDS = 300;

export class EditorialCacheService {
  private readonly freshTtlSeconds: number;

  private readonly staleTtlSeconds: number;

  private readonly tracer: Tracer;

  constructor(
    private readonly cache: CacheClient,
    private readonly editorialClient: PayloadEditorialClient,
    options: EditorialCacheServiceOptions = {},
  ) {
    this.freshTtlSeconds = options.freshTtlSeconds ?? DEFAULT_FRESH_TTL_SECONDS;
    this.staleTtlSeconds = options.staleTtlSeconds ?? DEFAULT_STALE_TTL_SECONDS;
    this.tracer = options.tracer ?? trace.getTracer('simket-editorial-cache');
  }

  async getArticle(slug: string): Promise<Article | undefined> {
    return this.tracer.startActiveSpan('editorial.cache.getArticle', async (span) => {
      span.setAttribute('editorial.slug', slug);

      try {
        return await this.cache.getOrSetSwr(
          articleCacheKey(slug),
          () => this.editorialClient.getArticleBySlug(slug),
          this.freshTtlSeconds,
          this.staleTtlSeconds,
        );
      } catch (error) {
        markSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getFeaturedProducts(sectionId: string): Promise<readonly FeaturedProduct[]> {
    return this.tracer.startActiveSpan('editorial.cache.getFeaturedProducts', async (span) => {
      span.setAttribute('editorial.section_id', sectionId);

      try {
        return await this.cache.getOrSetSwr(
          featuredProductsCacheKey(sectionId),
          () => this.editorialClient.getFeaturedProducts(sectionId),
          this.freshTtlSeconds,
          this.staleTtlSeconds,
        );
      } catch (error) {
        markSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getCuratedCollections(): Promise<readonly CuratedCollection[]> {
    return this.tracer.startActiveSpan('editorial.cache.getCuratedCollections', async (span) => {
      try {
        return await this.cache.getOrSetSwr(
          curatedCollectionsCacheKey(),
          async () => {
            const [sections, articles] = await Promise.all([
              this.editorialClient.getTodaySections(),
              this.editorialClient.getPublishedArticles(),
            ]);
            const activeSections = [...sections]
              .filter((section) => section.isActive)
              .sort(
                (left, right) =>
                  left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
              );
            const productsBySectionId = new Map<string, readonly FeaturedProduct[]>();

            await Promise.all(
              activeSections.map(async (section) => {
                productsBySectionId.set(section.id, await this.getFeaturedProducts(section.id));
              }),
            );

            return activeSections.map((section) =>
              mapCuratedCollection(
                section,
                articles.filter((article) => article.section?.id === section.id),
                productsBySectionId.get(section.id) ?? [],
              ),
            );
          },
          this.freshTtlSeconds,
          this.staleTtlSeconds,
        );
      } catch (error) {
        markSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async invalidateForWebhook(event: EditorialWebhookEvent): Promise<EditorialInvalidationResult> {
    return this.tracer.startActiveSpan('editorial.cache.invalidateForWebhook', async (span) => {
      span.setAttributes({
        'editorial.collection': event.collection,
        'editorial.operation': event.operation,
        'editorial.event_id': event.eventId,
      });

      const keys = new Set<string>();
      const patterns = new Set<string>();

      const currentSlug = event.doc?.slug;
      const previousSlug = event.previousDoc?.slug;
      if (currentSlug) {
        keys.add(articleCacheKey(currentSlug));
      }
      if (previousSlug) {
        keys.add(articleCacheKey(previousSlug));
      }

      keys.add(curatedCollectionsCacheKey());

      if (event.collection === 'articles' || event.collection === 'featured-products') {
        patterns.add(featuredProductsCachePattern());
      }

      if (event.collection === 'editorial-sections') {
        patterns.add(featuredProductsCachePattern());
      }

      try {
        await Promise.all([
          ...[...keys].map((key) => this.cache.delete(key)),
          ...[...patterns].map((pattern) => this.cache.deletePattern(pattern)),
        ]);

        span.setAttribute('editorial.invalidate.keys', keys.size);
        span.setAttribute('editorial.invalidate.patterns', patterns.size);

        return {
          keys: [...keys],
          patterns: [...patterns],
        };
      } catch (error) {
        markSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

function articleCacheKey(slug: string): string {
  return editorialCacheKey(`article:${slug}`);
}

function curatedCollectionsCacheKey(): string {
  return editorialCacheKey('curated-collections');
}

function featuredProductsCacheKey(sectionId: string): string {
  return editorialCacheKey(`featured-products:${sectionId}`);
}

function featuredProductsCachePattern(): string {
  return editorialCacheKey('featured-products:*');
}

function mapCuratedCollection(
  section: PayloadEditorialSection,
  articles: readonly Article[],
  featuredProducts: readonly FeaturedProduct[],
): CuratedCollection {
  return {
    id: section.id,
    name: section.name,
    slug: section.slug,
    layout: section.layout,
    sortOrder: section.sortOrder,
    items: [...articles]
      .sort(
        (left, right) =>
          new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
      )
      .map(mapCuratedCollectionItem),
    featuredProducts: [...featuredProducts],
  };
}

function mapCuratedCollectionItem(article: Article): CuratedCollectionItem {
  return {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    heroImage: article.heroImage.url,
    heroTransparent: article.heroTransparent?.url,
    author: article.author,
    publishedAt: article.publishedAt,
    slug: article.slug,
    tags: article.tags,
  };
}

function markSpanError(span: import('@opentelemetry/api').Span, error: unknown): void {
  span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
}
