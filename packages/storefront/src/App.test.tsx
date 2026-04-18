import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('is a function component', () => {
    expect(typeof App).toBe('function');
  });

  it('is exported from the package', async () => {
    const mod = await import('./index');
    expect(mod.App).toBe(App);
  });
});
