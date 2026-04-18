/**
 * Purpose: Wrap the official Qdrant REST client with Simket validation,
 * resilience, and tracing for vector collection management and similarity
 * search.
 *
 * Governing docs:
 *   - docs/architecture.md (§4 pluggable recommenders, §9 outbound calls)
 *   - docs/service-architecture.md (§1.2 Recommend service API, §1.9 Qdrant)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://qdrant.tech/documentation/
 *   - https://qdrant.tech/documentation/concepts/collections/
 *   - https://qdrant.tech/documentation/concepts/filtering/
 *   - https://qdrant.tech/documentation/search/search/
 *   - https://api.qdrant.tech/api-reference/collections/create-collection
 *   - https://api.qdrant.tech/api-reference/points/upsert-points
 *   - https://api.qdrant.tech/api-reference/points/scroll-points
 *   - https://api.qdrant.tech/api-reference/search/points
 *   - https://github.com/qdrant/qdrant-js/tree/master/packages/js-client-rest
 * Tests:
 *   - packages/recommend-service/src/qdrant/qdrant.service.test.ts
 */

import {
  QdrantClient,
  type Schemas,
} from '@qdrant/js-client-rest';
import {
  bulkhead,
  circuitBreaker,
  ExponentialBackoff,
  handleAll,
  retry,
  SamplingBreaker,
  timeout,
  TimeoutStrategy,
  wrap,
  type IPolicy,
} from 'cockatiel';
import {
  SpanStatusCode,
  trace,
  type Attributes,
  type Span,
  type Tracer,
} from '@opentelemetry/api';

import type {
  FilterCondition,
  ProductVector,
  QdrantConfig,
  QdrantFilter,
  SearchOptions,
  SimilarityResult,
} from './qdrant.types.js';

const DEFAULT_TIMEOUT_SECONDS = 3;
const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;
const QDRANT_TRACER_NAME = 'simket-recommend-qdrant';

type DenseVector = number[];
type StoredProductPayload = ProductVector['payload'] & { productId: string };

export interface ResiliencePolicy {
  execute<T>(fn: () => Promise<T>): Promise<T>;
}

export interface QdrantServiceOptions {
  readonly config: QdrantConfig;
  readonly client?: QdrantClientLike;
  readonly tracer?: Tracer;
  readonly resiliencePolicy?: ResiliencePolicy;
}

export type QdrantClientLike = Pick<
  QdrantClient,
  | 'collectionExists'
  | 'createCollection'
  | 'upsert'
  | 'search'
  | 'retrieve'
  | 'delete'
  | 'getCollection'
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeOptionalAttributes(
  attributes: Attributes,
): Attributes {
  return Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined),
  );
}

function isEmptyFilter(filter?: QdrantFilter): boolean {
  return !filter || (!filter.must?.length && !filter.mustNot?.length);
}

function toStoredPayload(product: ProductVector): StoredProductPayload {
  return {
    ...product.payload,
    productId: product.productId,
  };
}

function ensureDenseVector(vector: unknown, context: string): DenseVector {
  if (!Array.isArray(vector) || vector.some((value) => typeof value !== 'number')) {
    throw new Error(`${context} must be a dense numeric vector.`);
  }

  return [...vector];
}

function toSimilarityResult(point: Schemas['ScoredPoint']): SimilarityResult {
  return {
    productId: String(point.id),
    score: point.score,
    payload: isRecord(point.payload) ? point.payload : {},
  };
}

function toProductVector(record: Schemas['Record']): ProductVector {
  const payload = isRecord(record.payload) ? record.payload : undefined;
  if (!payload) {
    throw new Error(`Qdrant record ${String(record.id)} is missing its payload.`);
  }

  const vector = ensureDenseVector(
    record.vector,
    `Qdrant record ${String(record.id)} vector`,
  );

  const name = payload.name;
  const creatorId = payload.creatorId;
  const categoryId = payload.categoryId;
  const tags = payload.tags;
  const price = payload.price;
  const salesCount = payload.salesCount;
  const createdAt = payload.createdAt;

  if (
    typeof name !== 'string' ||
    typeof creatorId !== 'string' ||
    typeof categoryId !== 'string' ||
    !Array.isArray(tags) ||
    tags.some((tag) => typeof tag !== 'string') ||
    typeof price !== 'number' ||
    typeof salesCount !== 'number' ||
    typeof createdAt !== 'string'
  ) {
    throw new Error(`Qdrant record ${String(record.id)} has an invalid product payload.`);
  }

  return {
    productId: String(record.id),
    vector,
    payload: {
      name,
      creatorId,
      categoryId,
      tags,
      price,
      salesCount,
      createdAt,
    },
  };
}

function toQdrantCondition(condition: FilterCondition): Schemas['Condition'] {
  const { key, match, range } = condition;
  const hasMatch = match !== undefined;
  const hasRange = range !== undefined;

  if (!hasMatch && !hasRange) {
    throw new Error(`Qdrant filter condition "${key}" must define match or range.`);
  }

  return {
    key,
    ...(hasMatch ? { match } : {}),
    ...(hasRange ? { range } : {}),
  };
}

function toQdrantFilter(filter?: QdrantFilter): Schemas['Filter'] | undefined {
  const resolvedFilter = filter;
  if (!resolvedFilter || isEmptyFilter(resolvedFilter)) {
    return undefined;
  }

  const must = resolvedFilter.must;
  const mustNot = resolvedFilter.mustNot;

  return {
    ...(must?.length
      ? { must: must.map(toQdrantCondition) }
      : {}),
    ...(mustNot?.length
      ? { must_not: mustNot.map(toQdrantCondition) }
      : {}),
  };
}

function maybeNormalizeVector(
  vector: readonly number[],
  distanceMetric: QdrantConfig['distanceMetric'],
): DenseVector {
  return distanceMetric === 'Cosine'
    ? normalizeVector([...vector])
    : [...vector];
}

export function buildQdrantFilter(options: {
  excludeIds?: string[];
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
}): QdrantFilter {
  const must: FilterCondition[] = [];
  const mustNot: FilterCondition[] = [];

  if (options.categoryId) {
    must.push({
      key: 'categoryId',
      match: { value: options.categoryId },
    });
  }

  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    must.push({
      key: 'price',
      range: {
        ...(options.minPrice !== undefined ? { gte: options.minPrice } : {}),
        ...(options.maxPrice !== undefined ? { lte: options.maxPrice } : {}),
      },
    });
  }

  for (const productId of options.excludeIds ?? []) {
    if (productId.trim().length === 0) {
      continue;
    }

    mustNot.push({
      key: 'productId',
      match: { value: productId },
    });
  }

  return {
    ...(must.length > 0 ? { must } : {}),
    ...(mustNot.length > 0 ? { mustNot } : {}),
  };
}

export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );

  if (magnitude === 0) {
    throw new Error('Cannot normalize a zero-length vector.');
  }

  return vector.map((value) => value / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Cosine similarity requires vectors of equal length.');
  }

  if (a.length === 0) {
    throw new Error('Cosine similarity requires non-empty vectors.');
  }

  const denominator = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0)) *
    Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));

  if (denominator === 0) {
    throw new Error('Cosine similarity is undefined for zero-length vectors.');
  }

  const numerator = a.reduce(
    (sum, value, index) => sum + value * b[index]!,
    0,
  );

  return numerator / denominator;
}

export function validateQdrantConfig(config: QdrantConfig): void {
  const errors: string[] = [];

  if (config.url.trim().length === 0) {
    errors.push('url must be non-empty');
  }

  if (config.collectionName.trim().length === 0) {
    errors.push('collectionName must be non-empty');
  }

  if (!Number.isInteger(config.vectorSize) || config.vectorSize < 1) {
    errors.push('vectorSize must be a positive integer');
  }

  if (errors.length > 0) {
    throw new Error(`Qdrant config is invalid: ${errors.join(', ')}.`);
  }
}

export function validateProductVector(
  product: ProductVector,
  vectorSize: number,
): void {
  const errors: string[] = [];

  if (product.productId.trim().length === 0) {
    errors.push('productId must be non-empty');
  }

  if (product.vector.length !== vectorSize) {
    errors.push(`vector size must match configured size ${vectorSize}`);
  }

  if (product.payload.tags.some((tag) => tag.trim().length === 0)) {
    errors.push('payload.tags must not contain empty values');
  }

  if (!Number.isFinite(Date.parse(product.payload.createdAt))) {
    errors.push('payload.createdAt must be a valid ISO date');
  }

  if (errors.length > 0) {
    throw new Error(`ProductVector is invalid: ${errors.join(', ')}.`);
  }
}

export function validateSearchOptions(
  options: SearchOptions,
  vectorSize: number,
): void {
  const errors: string[] = [];

  if (options.vector.length !== vectorSize) {
    errors.push(`vector size must match configured size ${vectorSize}`);
  }

  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > MAX_SEARCH_LIMIT) {
    errors.push(`limit must be an integer between 1 and ${MAX_SEARCH_LIMIT}`);
  }

  if (
    options.scoreThreshold !== undefined &&
    (!Number.isFinite(options.scoreThreshold) ||
      options.scoreThreshold < 0 ||
      options.scoreThreshold > 1)
  ) {
    errors.push('scoreThreshold must be between 0 and 1');
  }

  if (errors.length > 0) {
    throw new Error(`SearchOptions are invalid: ${errors.join(', ')}.`);
  }
}

function createQdrantResiliencePolicy(): ResiliencePolicy {
  const timeoutPolicy = timeout(
    DEFAULT_TIMEOUT_SECONDS * 1_000,
    TimeoutStrategy.Aggressive,
  );
  const retryPolicy = retry(handleAll, {
    maxAttempts: 2,
    backoff: new ExponentialBackoff({
      initialDelay: 200,
      maxDelay: 2_000,
    }),
  });
  const breakerPolicy = circuitBreaker(handleAll, {
    halfOpenAfter: 30_000,
    breaker: new SamplingBreaker({
      threshold: 0.5,
      duration: 30_000,
      minimumRps: 5,
    }),
  });
  const bulkheadPolicy = bulkhead(10, 50);
  const combined = (wrap as (...policies: IPolicy[]) => IPolicy)(
    timeoutPolicy,
    retryPolicy,
    breakerPolicy,
    bulkheadPolicy,
  );

  return {
    execute<T>(fn: () => Promise<T>): Promise<T> {
      return combined.execute(fn) as Promise<T>;
    },
  };
}

export class QdrantService {
  private readonly client: QdrantClientLike;
  private readonly tracer: Tracer;
  private readonly resiliencePolicy: ResiliencePolicy;

  constructor(private readonly options: QdrantServiceOptions) {
    validateQdrantConfig(options.config);
    this.client = options.client ?? new QdrantClient({
      url: options.config.url,
      apiKey: options.config.apiKey,
    });
    this.tracer = options.tracer ?? trace.getTracer(QDRANT_TRACER_NAME);
    this.resiliencePolicy = options.resiliencePolicy ?? createQdrantResiliencePolicy();
  }

  async ensureCollection(): Promise<void> {
    await this.withSpan(
      'qdrant.ensure_collection',
      {
        'qdrant.collection_name': this.options.config.collectionName,
        'qdrant.vector_size': this.options.config.vectorSize,
        'qdrant.distance_metric': this.options.config.distanceMetric,
      },
      async () => {
        const exists = await this.resiliencePolicy.execute(() =>
          this.client.collectionExists(this.options.config.collectionName),
        );

        if (!exists.exists) {
          await this.resiliencePolicy.execute(() =>
            this.client.createCollection(this.options.config.collectionName, {
              vectors: {
                size: this.options.config.vectorSize,
                distance: this.options.config.distanceMetric,
              },
            }),
          );
        }
      },
    );
  }

  async upsertProduct(product: ProductVector): Promise<void> {
    validateProductVector(product, this.options.config.vectorSize);

    await this.withSpan(
      'qdrant.upsert_product',
      {
        'qdrant.collection_name': this.options.config.collectionName,
        'qdrant.product_id': product.productId,
        'qdrant.vector_count': 1,
      },
      async () => {
        await this.resiliencePolicy.execute(() =>
          this.client.upsert(this.options.config.collectionName, {
            wait: true,
            points: [
              {
                id: product.productId,
                vector: maybeNormalizeVector(
                  product.vector,
                  this.options.config.distanceMetric,
                ),
                payload: toStoredPayload(product),
              },
            ],
          }),
        );
      },
    );
  }

  async upsertProducts(products: ProductVector[]): Promise<void> {
    for (const product of products) {
      validateProductVector(product, this.options.config.vectorSize);
    }

    await this.withSpan(
      'qdrant.upsert_products',
      {
        'qdrant.collection_name': this.options.config.collectionName,
        'qdrant.vector_count': products.length,
      },
      async () => {
        await this.resiliencePolicy.execute(() =>
          this.client.upsert(this.options.config.collectionName, {
            wait: true,
            points: products.map((product) => ({
              id: product.productId,
              vector: maybeNormalizeVector(
                product.vector,
                this.options.config.distanceMetric,
              ),
              payload: toStoredPayload(product),
            })),
          }),
        );
      },
    );
  }

  async searchSimilar(options: SearchOptions): Promise<SimilarityResult[]> {
    validateSearchOptions(options, this.options.config.vectorSize);

    return this.withSpan(
      'qdrant.search_similar',
      {
        'qdrant.collection_name': this.options.config.collectionName,
        'qdrant.search_limit': options.limit,
        'qdrant.score_threshold': options.scoreThreshold,
      },
      async (span) => {
        const results = await this.resiliencePolicy.execute(() =>
          this.client.search(this.options.config.collectionName, {
            vector: maybeNormalizeVector(
              options.vector,
              this.options.config.distanceMetric,
            ),
            limit: options.limit,
            score_threshold: options.scoreThreshold,
            filter: toQdrantFilter(options.filter),
            with_payload: true,
            with_vector: false,
          }),
        );
        const mapped = results.map(toSimilarityResult);
        span.setAttribute('qdrant.result_count', mapped.length);
        return mapped;
      },
    );
  }

  async getProductVector(productId: string): Promise<ProductVector | undefined> {
    return this.withSpan(
      'qdrant.get_product_vector',
      {
        'qdrant.collection_name': this.options.config.collectionName,
        'qdrant.product_id': productId,
      },
      async () => {
        const [record] = await this.resiliencePolicy.execute(() =>
          this.client.retrieve(this.options.config.collectionName, {
            ids: [productId],
            with_payload: true,
            with_vector: true,
          }),
        );

        return record ? toProductVector(record) : undefined;
      },
    );
  }

  async deleteProduct(productId: string): Promise<boolean> {
    return this.withSpan(
      'qdrant.delete_product',
      {
        'qdrant.collection_name': this.options.config.collectionName,
        'qdrant.product_id': productId,
      },
      async () => {
        const [existing] = await this.resiliencePolicy.execute(() =>
          this.client.retrieve(this.options.config.collectionName, {
            ids: [productId],
            with_payload: false,
            with_vector: false,
          }),
        );

        if (!existing) {
          return false;
        }

        await this.resiliencePolicy.execute(() =>
          this.client.delete(this.options.config.collectionName, {
            wait: true,
            points: [productId],
          }),
        );

        return true;
      },
    );
  }

  async collectionInfo(): Promise<{ vectorCount: number; status: string }> {
    return this.withSpan(
      'qdrant.collection_info',
      {
        'qdrant.collection_name': this.options.config.collectionName,
      },
      async (span) => {
        const info = await this.resiliencePolicy.execute(() =>
          this.client.getCollection(this.options.config.collectionName),
        );
        const vectorCount = info.points_count ?? info.indexed_vectors_count ?? 0;
        span.setAttribute('qdrant.vector_count', vectorCount);
        return {
          vectorCount,
          status: info.status,
        };
      },
    );
  }

  private async withSpan<T>(
    name: string,
    attributes: Attributes,
    operation: (span: Span) => Promise<T> | T,
  ): Promise<T> {
    return this.tracer.startActiveSpan(name, async (span) => {
      span.setAttributes(sanitizeOptionalAttributes(attributes));

      try {
        const result = await operation(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
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
}

export function createDefaultSearchOptions(
  vector: readonly number[],
): SearchOptions {
  return {
    vector,
    limit: DEFAULT_SEARCH_LIMIT,
  };
}
