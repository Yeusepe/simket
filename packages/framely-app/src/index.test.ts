import { describe, it, expect } from 'vitest';

describe('@simket/framely-app', () => {
  it('exports an empty module', async () => {
    const mod = await import('./index.js');
    expect(mod).toBeDefined();
  });
});
