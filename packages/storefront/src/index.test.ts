import { describe, it, expect } from 'vitest';

describe('@simket/storefront', () => {
  it('exports an empty module', async () => {
    const mod = await import('./index.js');
    expect(mod).toBeDefined();
  });
});
