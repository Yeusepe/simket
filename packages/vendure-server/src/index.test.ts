import { describe, it, expect } from 'vitest';

describe('@simket/vendure-server exports', () => {
  it('re-exports config', async () => {
    const mod = await import('./index.js');
    expect(mod.config).toBeDefined();
    expect(mod.config.apiOptions?.shopApiPath).toBe('shop-api');
  });

  it('re-exports cache utilities', async () => {
    const mod = await import('./index.js');
    expect(typeof mod.cacheKey).toBe('function');
    expect(typeof mod.getOrFetch).toBe('function');
    expect(typeof mod.invalidate).toBe('function');
  });

  it('re-exports health indicators', async () => {
    const mod = await import('./index.js');
    expect(mod.RedisHealthIndicator).toBeDefined();
    expect(mod.EventLoopHealthIndicator).toBeDefined();
  });
});
