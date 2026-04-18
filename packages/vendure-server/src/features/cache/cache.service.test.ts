/**
 * Purpose: Unit tests for the Redis-backed cache service and cache key builders.
 * Governing docs:
 *   - docs/architecture.md (§2 Cache-aside, delete-on-write)
 *   - docs/service-architecture.md (§1 Service surfaces, §3 Request-path posture)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://github.com/redis/ioredis
 *   - https://redis.io/docs/latest/commands/scan/
 *   - packages/vendure-server/node_modules/ioredis/built/Redis.d.ts
 *   - packages/vendure-server/node_modules/ioredis/built/utils/RedisCommander.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/cache/cache.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '../../observability/index.js';
import type { ResiliencePolicy } from '../../resilience/resilience.js';
import type { CacheConfig, CacheEntry, SwrCacheEntry } from './cache.types.js';
import {
  RedisCacheService,
  buildCacheKey,
  editorialCacheKey,
  productCacheKey,
  searchCacheKey,
  userSessionCacheKey,
} from './cache.service.js';

type RedisCommandName = 'get' | 'set' | 'del' | 'scan';

class FakeRedis {
  readonly store = new Map<string, string>();

  readonly ttlSeconds = new Map<string, number>();

  readonly failures = new Map<RedisCommandName, Error>();

  async get(key: string): Promise<string | null> {
    this.throwIfConfigured('get');
    return this.store.get(key) ?? null;
  }

  async set(
    key: string,
    value: string,
    secondsToken: 'EX',
    seconds: number,
  ): Promise<'OK'> {
    this.throwIfConfigured('set');
    expect(secondsToken).toBe('EX');
    this.store.set(key, value);
    this.ttlSeconds.set(key, seconds);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    this.throwIfConfigured('del');
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        this.ttlSeconds.delete(key);
        deleted += 1;
      }
    }
    return deleted;
  }

  async scan(
    cursor: string,
    patternToken: 'MATCH',
    pattern: string,
    countToken: 'COUNT',
    count: number,
  ): Promise<[string, string[]]> {
    this.throwIfConfigured('scan');
    expect(patternToken).toBe('MATCH');
    expect(countToken).toBe('COUNT');

    if (cursor !== '0') {
      return ['0', []];
    }

    const regex = globToRegExp(pattern);
    const keys = [...this.store.keys()].filter((key) => regex.test(key)).slice(0, count);
    return ['0', keys];
  }

  private throwIfConfigured(command: RedisCommandName): void {
    const error = this.failures.get(command);
    if (error) {
      throw error;
    }
  }
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function createLoggerMock(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

const PASSTHROUGH_POLICY: ResiliencePolicy = {
  execute<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  },
};

const CONFIG: CacheConfig = {
  defaultTtlSeconds: 300,
  keyPrefix: 'simket',
  maxRetries: 2,
};

function createService(options: {
  redis?: FakeRedis;
  logger?: Logger;
  now?: () => number;
  scheduleRefresh?: (refresh: () => Promise<void>) => void;
} = {}) {
  const redis = options.redis ?? new FakeRedis();
  const logger = options.logger ?? createLoggerMock();
  const scheduledRefreshes: Array<() => Promise<void>> = [];
  const service = new RedisCacheService(redis as never, CONFIG, {
    policy: PASSTHROUGH_POLICY,
    logger,
    now: options.now,
    scheduleRefresh:
      options.scheduleRefresh ??
      ((refresh) => {
        scheduledRefreshes.push(refresh);
      }),
  });

  return { redis, logger, service, scheduledRefreshes };
}

describe('RedisCacheService.get', () => {
  it('returns undefined on cache miss', async () => {
    const { service } = createService();

    await expect(service.get('product:42')).resolves.toBeUndefined();
  });

  it('returns parsed value on cache hit', async () => {
    const { redis, service } = createService();
    const entry: CacheEntry<{ title: string }> = {
      value: { title: 'Starter Pack' },
      cachedAt: 1_700_000_000_000,
      ttl: 120,
    };
    redis.store.set('simket:product:42', JSON.stringify(entry));

    await expect(service.get<{ title: string }>('product:42')).resolves.toEqual({
      title: 'Starter Pack',
    });
  });
});

describe('RedisCacheService.set', () => {
  it('stores a cache entry with metadata and TTL', async () => {
    const now = () => 1_700_000_001_000;
    const { redis, service } = createService({ now });

    await expect(service.set('product:42', { title: 'Starter Pack' }, 120)).resolves.toBeUndefined();

    expect(redis.ttlSeconds.get('simket:product:42')).toBe(120);

    const stored = JSON.parse(redis.store.get('simket:product:42') ?? 'null') as CacheEntry<{
      title: string;
    }>;
    expect(stored).toEqual({
      value: { title: 'Starter Pack' },
      cachedAt: now(),
      ttl: 120,
    });
  });
});

describe('RedisCacheService.delete', () => {
  it('returns true when the key existed', async () => {
    const { redis, service } = createService();
    redis.store.set('simket:product:42', JSON.stringify({ value: 1 }));

    await expect(service.delete('product:42')).resolves.toBe(true);
    expect(redis.store.has('simket:product:42')).toBe(false);
  });
});

describe('RedisCacheService.deletePattern', () => {
  it('scans and deletes matching keys', async () => {
    const { redis, service } = createService();
    redis.store.set('simket:product:1', JSON.stringify({ value: 1 }));
    redis.store.set('simket:product:2', JSON.stringify({ value: 2 }));
    redis.store.set('simket:editorial:today', JSON.stringify({ value: 3 }));

    await expect(service.deletePattern('product:*')).resolves.toBe(2);
    expect(redis.store.has('simket:product:1')).toBe(false);
    expect(redis.store.has('simket:product:2')).toBe(false);
    expect(redis.store.has('simket:editorial:today')).toBe(true);
  });
});

describe('RedisCacheService.getOrSet', () => {
  it('calls the factory on a cache miss and stores the value', async () => {
    const { redis, service } = createService();
    const factory = vi.fn().mockResolvedValue({ id: 'prod-1' });

    await expect(service.getOrSet('product:prod-1', factory)).resolves.toEqual({
      id: 'prod-1',
    });

    expect(factory).toHaveBeenCalledOnce();
    expect(redis.store.has('simket:product:prod-1')).toBe(true);
  });

  it('does not call the factory on a cache hit', async () => {
    const { redis, service } = createService();
    const factory = vi.fn().mockResolvedValue({ id: 'prod-1' });
    const entry: CacheEntry<{ id: string }> = {
      value: { id: 'prod-1' },
      cachedAt: 1_700_000_000_000,
      ttl: 300,
    };
    redis.store.set('simket:product:prod-1', JSON.stringify(entry));

    await expect(service.getOrSet('product:prod-1', factory)).resolves.toEqual({
      id: 'prod-1',
    });
    expect(factory).not.toHaveBeenCalled();
  });

  it('falls through to the factory when cache access fails', async () => {
    const { redis, service } = createService();
    redis.failures.set('get', new Error('redis unavailable'));
    const factory = vi.fn().mockResolvedValue({ id: 'prod-1' });

    await expect(service.getOrSet('product:prod-1', factory)).resolves.toEqual({
      id: 'prod-1',
    });
    expect(factory).toHaveBeenCalledOnce();
  });
});

describe('RedisCacheService.getOrSetSwr', () => {
  it('returns stale data within the stale window and schedules a refresh', async () => {
    const now = vi.fn().mockReturnValue(1_700_000_120_000);
    const { redis, service, scheduledRefreshes } = createService({ now });
    const staleEntry: SwrCacheEntry<{ id: string; title: string }> = {
      value: { id: 'prod-1', title: 'Old Title' },
      cachedAt: 1_700_000_000_000,
      ttl: 300,
      staleAfter: 60,
    };
    redis.store.set('simket:product:prod-1', JSON.stringify(staleEntry));

    const factory = vi.fn().mockResolvedValue({ id: 'prod-1', title: 'Fresh Title' });

    await expect(service.getOrSetSwr('product:prod-1', factory, 60, 300)).resolves.toEqual({
      id: 'prod-1',
      title: 'Old Title',
    });
    expect(factory).not.toHaveBeenCalled();
    expect(scheduledRefreshes).toHaveLength(1);

    await scheduledRefreshes[0]!();

    expect(factory).toHaveBeenCalledOnce();
    const refreshed = JSON.parse(
      redis.store.get('simket:product:prod-1') ?? 'null',
    ) as SwrCacheEntry<{ id: string; title: string }>;
    expect(refreshed.value.title).toBe('Fresh Title');
    expect(refreshed.staleAfter).toBe(60);
    expect(refreshed.ttl).toBe(300);
  });

  it('returns cached data without scheduling a refresh while still fresh', async () => {
    const now = () => 1_700_000_030_000;
    const { redis, service, scheduledRefreshes } = createService({ now });
    const freshEntry: SwrCacheEntry<{ id: string }> = {
      value: { id: 'prod-1' },
      cachedAt: 1_700_000_000_000,
      ttl: 300,
      staleAfter: 60,
    };
    redis.store.set('simket:product:prod-1', JSON.stringify(freshEntry));
    const factory = vi.fn().mockResolvedValue({ id: 'prod-1' });

    await expect(service.getOrSetSwr('product:prod-1', factory, 60, 300)).resolves.toEqual({
      id: 'prod-1',
    });
    expect(factory).not.toHaveBeenCalled();
    expect(scheduledRefreshes).toHaveLength(0);
  });
});

describe('cache key builders', () => {
  it('buildCacheKey joins the prefix and parts with colons', () => {
    expect(buildCacheKey('product', '42', 'summary')).toBe('product:42:summary');
  });

  it('builds stable search cache keys regardless of filter order', () => {
    expect(
      searchCacheKey('shader', {
        category: 'unity',
        tag: 'stylized',
      }),
    ).toBe(
      searchCacheKey('shader', {
        tag: 'stylized',
        category: 'unity',
      }),
    );
  });

  it('handles empty search filters and common entity key builders', () => {
    expect(searchCacheKey('shader', {})).toBe('search:shader:all');
    expect(productCacheKey('42')).toBe('product:42');
    expect(editorialCacheKey('today')).toBe('editorial:today');
    expect(userSessionCacheKey('user-1')).toBe('user-session:user-1');
  });
});
