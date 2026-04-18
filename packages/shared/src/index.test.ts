import { describe, it, expect } from 'vitest';

describe('@simket/shared', () => {
  it('exports an empty module', async () => {
    const mod = await import('./index.js');
    expect(mod).toBeDefined();
  });
});
