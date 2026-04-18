import { describe, it, expect } from 'vitest';
import { cacheKey } from './cache-aside.js';

describe('cacheKey', () => {
  it('builds a key without version', () => {
    expect(cacheKey('product', '42')).toBe('simket:product:42');
  });

  it('builds a key with version', () => {
    expect(cacheKey('product', '42', 'v3')).toBe('simket:product:42:v3');
  });
});
