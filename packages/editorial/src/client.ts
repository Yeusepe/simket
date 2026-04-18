/**
 * Purpose: Typed REST client for storefront editorial reads from PayloadCMS with
 * OpenTelemetry spans and bounded resilience policies.
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
 *   - https://github.com/connor4312/cockatiel
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/#create-spans
 * Tests:
 *   - packages/editorial/tests/featured-products.test.ts
 */

import { context, propagation, SpanStatusCode, trace } from '@opentelemetry/api';
import {
  circuitBreaker,
  ConsecutiveBreaker,
  ExponentialBackoff,
  handleWhen,
  retry,
  timeout,
  TimeoutStrategy,
  wrap,
} from 'cockatiel';

import { isArticle, isEditorialSection, parsePaginatedCollectionResponse } from './guards.js';
import type {
  Article,
  EditorialSection,
  FeaturedProduct,
  PaginatedCollectionResponse,
} from './types.js';

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

type EditorialClientOptions = {
  readonly fetcher?: Fetcher;
};

type CollectionWhere =
  | Record<string, unknown>
  | {
      readonly and: readonly Record<string, unknown>[];
    };

const tracer = trace.getTracer('simket-editorial');

const handledFailures = handleWhen((error) => error instanceof Error).orWhenResult(
  (result) => result instanceof Response && (result.status === 429 || result.status >= 500),
);

const editorialReadPolicy = wrap(
  retry(handledFailures, {
    maxAttempts: 3,
    backoff: new ExponentialBackoff({
      initialDelay: 100,
      maxDelay: 1_000,
    }),
  }),
  circuitBreaker(handledFailures, {
    breaker: new ConsecutiveBreaker(5),
    halfOpenAfter: 10_000,
  }),
  timeout(5_000, TimeoutStrategy.Aggressive),
);

function appendWhere(url: URL, where: CollectionWhere): void {
  url.searchParams.set('where', JSON.stringify(where));
}

function appendLimit(url: URL, limit?: number): void {
  if (typeof limit === 'number') {
    url.searchParams.set('limit', String(limit));
  }
}

function buildPublishedArticleWhere(section?: string): CollectionWhere {
  const clauses: Record<string, unknown>[] = [{ status: { equals: 'published' } }];

  if (section) {
    clauses.push({ section: { equals: section } });
  }

  return section ? { and: clauses } : clauses[0]!;
}

function compareFeaturedProducts(left: FeaturedProduct, right: FeaturedProduct): number {
  return left.priority - right.priority || left.productId.localeCompare(right.productId);
}

export class EditorialClient {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;

  constructor(baseUrl: string, options?: EditorialClientOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetcher = options?.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  async getPublishedArticles(options?: {
    section?: string;
    limit?: number;
  }): Promise<Article[]> {
    const url = this.buildCollectionUrl('articles', {
      depth: 2,
      sort: '-publishedAt',
      where: buildPublishedArticleWhere(options?.section),
      limit: options?.limit,
    });

    const response = await this.requestCollection(url, isArticle, 'articles');
    return [...response.docs];
  }

  async getArticleBySlug(slug: string): Promise<Article | undefined> {
    const url = this.buildCollectionUrl('articles', {
      depth: 2,
      limit: 1,
      where: {
        and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }],
      },
    });

    const response = await this.requestCollection(url, isArticle, 'articles');
    return response.docs[0];
  }

  async getTodaySections(): Promise<EditorialSection[]> {
    const url = this.buildCollectionUrl('editorial-sections', {
      sort: 'sortOrder',
      where: { isActive: { equals: true } },
    });

    const response = await this.requestCollection(url, isEditorialSection, 'editorial-sections');
    return [...response.docs];
  }

  async getFeaturedProducts(sectionId: string): Promise<FeaturedProduct[]> {
    const url = this.buildCollectionUrl('articles', {
      depth: 2,
      limit: 100,
      where: {
        and: [{ status: { equals: 'published' } }, { section: { equals: sectionId } }],
      },
    });

    const response = await this.requestCollection(url, isArticle, 'articles');
    const products = new Map<string, FeaturedProduct>();

    for (const article of response.docs) {
      for (const product of article.featuredProducts) {
        const existing = products.get(product.id);

        if (!existing || compareFeaturedProducts(product, existing) < 0) {
          products.set(product.id, product);
        }
      }
    }

    return [...products.values()].sort(compareFeaturedProducts);
  }

  private buildCollectionUrl(
    collection: string,
    options: {
      readonly depth?: number;
      readonly sort?: string;
      readonly where: CollectionWhere;
      readonly limit?: number;
    },
  ): URL {
    const url = new URL(`/api/${collection}`, this.baseUrl);

    if (typeof options.depth === 'number') {
      url.searchParams.set('depth', String(options.depth));
    }

    if (options.sort) {
      url.searchParams.set('sort', options.sort);
    }

    appendLimit(url, options.limit);
    appendWhere(url, options.where);

    return url;
  }

  private async requestCollection<T>(
    url: URL,
    guard: (value: unknown) => value is T,
    collectionName: string,
  ): Promise<PaginatedCollectionResponse<T>> {
    return tracer.startActiveSpan(`editorial.${collectionName}.read`, async (span) => {
      try {
        span.setAttributes({
          'editorial.collection': collectionName,
          'http.method': 'GET',
          'url.full': url.toString(),
        });

        const headers = this.buildHeaders();
        const response = await editorialReadPolicy.execute(({ signal }) =>
          this.fetcher(url, {
            method: 'GET',
            headers,
            signal,
          }),
        );

        span.setAttribute('http.status_code', response.status);

        if (!response.ok) {
          throw new Error(
            `Payload request for ${collectionName} failed with status ${response.status}.`,
          );
        }

        const json = (await response.json()) as unknown;
        return parsePaginatedCollectionResponse(json, guard, collectionName);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        span.recordException(error instanceof Error ? error : new Error(message));
        span.setStatus({ code: SpanStatusCode.ERROR, message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private buildHeaders(): Headers {
    const propagatedHeaders: Record<string, string> = {};
    propagation.inject(context.active(), propagatedHeaders);

    const headers = new Headers({ Accept: 'application/json' });
    for (const [key, value] of Object.entries(propagatedHeaders)) {
      headers.set(key, value);
    }

    return headers;
  }
}
