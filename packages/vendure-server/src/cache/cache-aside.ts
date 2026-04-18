import { getCacheRedis } from './redis.js';

/**
 * Cache-aside helper per architecture §2 rule #12:
 *   - On read: get from cache → miss → fetch from source → SET with TTL + jitter.
 *   - On write: DELETE cache key (never SET). Next read populates.
 *
 * Key format: `simket:{entity}:{id}:{version}`
 */

const DEFAULT_TTL_SECONDS = 300; // 5 minutes
const JITTER_MAX_SECONDS = 60; // ±30s to prevent thundering herd

function jitteredTtl(baseTtl: number): number {
  const jitter = Math.floor(Math.random() * JITTER_MAX_SECONDS) - JITTER_MAX_SECONDS / 2;
  return Math.max(baseTtl + jitter, 10);
}

export function cacheKey(entity: string, id: string, version?: string): string {
  return version ? `simket:${entity}:${id}:${version}` : `simket:${entity}:${id}`;
}

/**
 * Get a value from cache, or fetch from source and populate.
 */
export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<T> {
  const redis = getCacheRedis();
  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }
  const value = await fetcher();
  const ttl = jitteredTtl(ttlSeconds);
  await redis.set(key, JSON.stringify(value), 'EX', ttl);
  return value;
}

/**
 * Invalidate a cache key. Per architecture rule #12: delete, never overwrite.
 */
export async function invalidate(key: string): Promise<void> {
  const redis = getCacheRedis();
  await redis.del(key);
}

/**
 * Invalidate multiple cache keys by pattern (e.g., `simket:product:123:*`).
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const redis = getCacheRedis();
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}
