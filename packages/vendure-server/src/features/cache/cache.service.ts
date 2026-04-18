/**
 * Purpose: Redis-backed cache service with cache-aside and stale-while-revalidate helpers.
 * Governing docs:
 *   - docs/architecture.md (§2 Cache-aside, delete-on-write)
 *   - docs/service-architecture.md (§3 Request-path posture)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://github.com/redis/ioredis
 *   - https://redis.io/docs/latest/commands/scan/
 *   - https://redis.io/docs/latest/commands/keys/
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/#create-spans
 *   - packages/vendure-server/node_modules/ioredis/built/Redis.d.ts
 *   - packages/vendure-server/node_modules/ioredis/built/utils/RedisCommander.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/cache/cache.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace, type Span, type Tracer } from '@opentelemetry/api';
import { Redis } from 'ioredis';
import {
  createLogger,
  recordCacheHit,
  recordCacheMiss,
  type Logger,
} from '../../observability/index.js';
import {
  createResiliencePolicy,
  type ResiliencePolicy,
} from '../../resilience/resilience.js';
import type {
  CacheConfig,
  CacheEntry,
  CacheKeyBuilder,
  CacheService,
  SwrCacheEntry,
} from './cache.types.js';

type RedisClient = Pick<Redis, 'get' | 'set' | 'del' | 'scan'>;
type StoredCacheEntry<T> = CacheEntry<T> | SwrCacheEntry<T>;

interface RedisCacheServiceOptions {
  readonly policy?: ResiliencePolicy;
  readonly logger?: Logger;
  readonly now?: () => number;
  readonly tracer?: Tracer;
  readonly scheduleRefresh?: (refresh: () => Promise<void>) => void;
}

const SCAN_COUNT = 100;

export const buildCacheKey: CacheKeyBuilder = (prefix, ...parts) =>
  `${prefix}:${parts.join(':')}`;

export function productCacheKey(productId: string): string {
  return buildCacheKey('product', productId);
}

export function searchCacheKey(
  query: string,
  filters: Record<string, string>,
): string {
  const normalizedFilters = Object.entries(filters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`);

  return buildCacheKey(
    'search',
    encodeURIComponent(query),
    normalizedFilters.length > 0 ? normalizedFilters.join('|') : 'all',
  );
}

export function editorialCacheKey(sectionSlug: string): string {
  return buildCacheKey('editorial', sectionSlug);
}

export function userSessionCacheKey(userId: string): string {
  return buildCacheKey('user-session', userId);
}

@Injectable()
export class RedisCacheService implements CacheService {
  private readonly policy: ResiliencePolicy;

  private readonly logger: Logger;

  private readonly now: () => number;

  private readonly tracer: Tracer;

  private readonly scheduleRefresh: (refresh: () => Promise<void>) => void;

  constructor(
    private readonly redis: RedisClient,
    private readonly config: CacheConfig,
    options: RedisCacheServiceOptions = {},
  ) {
    this.policy =
      options.policy ??
      createResiliencePolicy('redis-cache', {
        retry: {
          maxAttempts: Math.max(config.maxRetries, 1),
          initialDelay: 200,
          maxDelay: 5_000,
        },
      });
    this.logger = options.logger ?? createLogger('simket-cache');
    this.now = options.now ?? (() => Date.now());
    this.tracer = options.tracer ?? trace.getTracer('simket-cache');
    this.scheduleRefresh =
      options.scheduleRefresh ??
      ((refresh) => {
        void Promise.resolve()
          .then(refresh)
          .catch((error) => {
            this.logWarn('cache.swr.refresh_failed', undefined, error);
          });
      });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = await this.readEntry<T>(key, 'cache.get');
    return entry?.value;
  }

  async set<T>(key: string, value: T, ttlSeconds = this.config.defaultTtlSeconds): Promise<void> {
    const ttl = normalizePositiveSeconds(ttlSeconds, this.config.defaultTtlSeconds);
    const qualifiedKey = this.qualifyKey(key);

    await this.tracer.startActiveSpan('cache.set', async (span) => {
      span.setAttribute('cache.key', qualifiedKey);
      span.setAttribute('cache.ttl_seconds', ttl);

      try {
        const entry: CacheEntry<T> = {
          value,
          cachedAt: this.now(),
          ttl,
        };

        await this.policy.execute(() =>
          this.redis.set(qualifiedKey, JSON.stringify(entry), 'EX', ttl),
        );
      } catch (error) {
        this.markSpanError(span, error);
        this.logWarn('cache.set_failed', qualifiedKey, error);
      } finally {
        span.end();
      }
    });
  }

  async delete(key: string): Promise<boolean> {
    const qualifiedKey = this.qualifyKey(key);

    return this.tracer.startActiveSpan('cache.delete', async (span) => {
      span.setAttribute('cache.key', qualifiedKey);

      try {
        const deleted = await this.policy.execute(() => this.redis.del(qualifiedKey));
        span.setAttribute('cache.deleted', deleted > 0);
        return deleted > 0;
      } catch (error) {
        this.markSpanError(span, error);
        this.logWarn('cache.delete_failed', qualifiedKey, error);
        return false;
      } finally {
        span.end();
      }
    });
  }

  async deletePattern(pattern: string): Promise<number> {
    const qualifiedPattern = this.qualifyKey(pattern);

    return this.tracer.startActiveSpan('cache.deletePattern', async (span) => {
      span.setAttribute('cache.pattern', qualifiedPattern);

      try {
        let cursor = '0';
        let deletedCount = 0;

        do {
          const [nextCursor, keys] = await this.policy.execute(() =>
            this.redis.scan(cursor, 'MATCH', qualifiedPattern, 'COUNT', SCAN_COUNT),
          );
          cursor = nextCursor;

          if (keys.length > 0) {
            deletedCount += await this.policy.execute(() => this.redis.del(...keys));
          }
        } while (cursor !== '0');

        span.setAttribute('cache.deleted_count', deletedCount);
        return deletedCount;
      } catch (error) {
        this.markSpanError(span, error);
        this.logWarn('cache.delete_pattern_failed', qualifiedPattern, error);
        return 0;
      } finally {
        span.end();
      }
    });
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds = this.config.defaultTtlSeconds,
  ): Promise<T> {
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async getOrSetSwr<T>(
    key: string,
    factory: () => Promise<T>,
    freshTtlSeconds: number,
    staleTtlSeconds: number,
  ): Promise<T> {
    const freshTtl = normalizePositiveSeconds(
      freshTtlSeconds,
      this.config.defaultTtlSeconds,
    );
    const staleTtl = normalizePositiveSeconds(staleTtlSeconds, freshTtl);
    const entry = await this.readEntry<T>(key, 'cache.getOrSetSwr');

    if (entry) {
      const ageSeconds = (this.now() - entry.cachedAt) / 1000;
      const staleAfter = getStaleAfter(entry, freshTtl);

      if (ageSeconds < staleAfter) {
        return entry.value;
      }

      this.scheduleRefresh(async () => {
        const refreshedValue = await factory();
        await this.setSwr(key, refreshedValue, freshTtl, staleTtl);
      });
      return entry.value;
    }

    const value = await factory();
    await this.setSwr(key, value, freshTtl, staleTtl);
    return value;
  }

  private async setSwr<T>(
    key: string,
    value: T,
    freshTtlSeconds: number,
    staleTtlSeconds: number,
  ): Promise<void> {
    const qualifiedKey = this.qualifyKey(key);

    await this.tracer.startActiveSpan('cache.setSwr', async (span) => {
      span.setAttribute('cache.key', qualifiedKey);
      span.setAttribute('cache.stale_after_seconds', freshTtlSeconds);
      span.setAttribute('cache.ttl_seconds', staleTtlSeconds);

      try {
        const entry: SwrCacheEntry<T> = {
          value,
          cachedAt: this.now(),
          ttl: staleTtlSeconds,
          staleAfter: freshTtlSeconds,
        };

        await this.policy.execute(() =>
          this.redis.set(qualifiedKey, JSON.stringify(entry), 'EX', staleTtlSeconds),
        );
      } catch (error) {
        this.markSpanError(span, error);
        this.logWarn('cache.set_swr_failed', qualifiedKey, error);
      } finally {
        span.end();
      }
    });
  }

  private async readEntry<T>(
    key: string,
    spanName: string,
  ): Promise<StoredCacheEntry<T> | undefined> {
    const qualifiedKey = this.qualifyKey(key);
    const entity = key.split(':', 1)[0] ?? 'unknown';

    return this.tracer.startActiveSpan(spanName, async (span) => {
      span.setAttribute('cache.key', qualifiedKey);

      try {
        const serializedEntry = await this.policy.execute(() => this.redis.get(qualifiedKey));

        if (!serializedEntry) {
          span.setAttribute('cache.result', 'miss');
          recordCacheMiss(entity);
          return undefined;
        }

        const parsedEntry = JSON.parse(serializedEntry) as StoredCacheEntry<T>;
        if (!isStoredCacheEntry(parsedEntry)) {
          span.setAttribute('cache.result', 'invalid');
          recordCacheMiss(entity);
          this.logWarn('cache.invalid_entry', qualifiedKey);
          return undefined;
        }

        span.setAttribute('cache.result', 'hit');
        recordCacheHit(entity);
        return parsedEntry;
      } catch (error) {
        this.markSpanError(span, error);
        recordCacheMiss(entity);
        this.logWarn('cache.get_failed', qualifiedKey, error);
        return undefined;
      } finally {
        span.end();
      }
    });
  }

  private qualifyKey(key: string): string {
    return buildCacheKey(this.config.keyPrefix, key);
  }

  private markSpanError(span: Span, error: unknown): void {
    span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
  }

  private logWarn(message: string, key?: string, error?: unknown): void {
    this.logger.warn(message, {
      cacheKey: key,
      error: error instanceof Error ? error.message : error,
    });
  }
}

function normalizePositiveSeconds(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function getStaleAfter<T>(
  entry: StoredCacheEntry<T>,
  fallback: number,
): number {
  return 'staleAfter' in entry ? entry.staleAfter : fallback;
}

function isStoredCacheEntry<T>(value: unknown): value is StoredCacheEntry<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    'value' in entry &&
    typeof entry['cachedAt'] === 'number' &&
    typeof entry['ttl'] === 'number' &&
    (!('staleAfter' in entry) || typeof entry['staleAfter'] === 'number')
  );
}
