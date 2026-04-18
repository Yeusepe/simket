import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';

/**
 * Redis connection factory.
 *
 * Two separate clusters per architecture §9:
 * - Cache cluster: allkeys-lru eviction, no persistence (port 6379)
 * - Queue cluster: noeviction, AOF persistence (port 6380)
 */

function buildOptions(overrides: Partial<RedisOptions> = {}): RedisOptions {
  return {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      return Math.min(times * 200, 5_000);
    },
    ...overrides,
  };
}

let cacheInstance: Redis | undefined;
let queueInstance: Redis | undefined;

export function getCacheRedis(): Redis {
  if (!cacheInstance) {
    cacheInstance = new Redis(
      buildOptions({
        host: process.env['REDIS_CACHE_HOST'] ?? 'localhost',
        port: Number(process.env['REDIS_CACHE_PORT'] ?? 6379),
        db: 0,
      }),
    );
  }
  return cacheInstance;
}

export function getQueueRedis(): Redis {
  if (!queueInstance) {
    queueInstance = new Redis(
      buildOptions({
        host: process.env['REDIS_QUEUE_HOST'] ?? 'localhost',
        port: Number(process.env['REDIS_QUEUE_PORT'] ?? 6380),
        db: 0,
      }),
    );
  }
  return queueInstance;
}

/**
 * Gracefully close both Redis connections.
 */
export async function shutdownRedis(): Promise<void> {
  const promises: Promise<string>[] = [];
  if (cacheInstance) {
    promises.push(cacheInstance.quit());
    cacheInstance = undefined;
  }
  if (queueInstance) {
    promises.push(queueInstance.quit());
    queueInstance = undefined;
  }
  await Promise.all(promises);
}
