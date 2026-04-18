/**
 * Purpose: Contracts for the Redis-backed cache feature, including SWR support.
 * Governing docs:
 *   - docs/architecture.md (§2 Cache-aside, delete-on-write)
 *   - docs/service-architecture.md (§3 Request-path posture)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://github.com/redis/ioredis
 *   - packages/vendure-server/node_modules/ioredis/built/Redis.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/cache/cache.service.test.ts
 */
export interface CacheConfig {
  readonly defaultTtlSeconds: number;
  readonly keyPrefix: string;
  readonly maxRetries: number;
}

export interface CacheEntry<T> {
  readonly value: T;
  readonly cachedAt: number;
  readonly ttl: number;
}

export interface SwrCacheEntry<T> extends CacheEntry<T> {
  readonly staleAfter: number;
}

export interface CacheService {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  deletePattern(pattern: string): Promise<number>;
  getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T>;
  getOrSetSwr<T>(
    key: string,
    factory: () => Promise<T>,
    freshTtlSeconds: number,
    staleTtlSeconds: number,
  ): Promise<T>;
}

export type CacheKeyBuilder = (...parts: readonly string[]) => string;
