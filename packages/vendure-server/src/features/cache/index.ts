/**
 * Purpose: Cache feature barrel for the Redis cache service, key builders, and contracts.
 * Governing docs:
 *   - docs/architecture.md (§2 Cache-aside, delete-on-write)
 *   - docs/service-architecture.md (§3 Request-path posture)
 * Tests:
 *   - packages/vendure-server/src/features/cache/cache.service.test.ts
 */
export {
  RedisCacheService,
  buildCacheKey,
  productCacheKey,
  searchCacheKey,
  editorialCacheKey,
  userSessionCacheKey,
} from './cache.service.js';
export type {
  CacheConfig,
  CacheEntry,
  CacheService,
  CacheKeyBuilder,
  SwrCacheEntry,
} from './cache.types.js';
