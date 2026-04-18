import { describe, it, expect } from 'vitest';

describe('@simket/storefront', () => {
  it('exports the App component', async () => {
    const mod = await import('./index');
    expect(mod.App).toBeDefined();
    expect(typeof mod.App).toBe('function');
  });
});
