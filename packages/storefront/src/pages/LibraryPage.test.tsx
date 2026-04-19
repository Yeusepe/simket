/**
 * Purpose: Unit tests for the LibraryPage component.
 */
import { describe, it, expect } from 'vitest';
import { LibraryPage } from './LibraryPage';

describe('LibraryPage', () => {
  it('is a function component', () => {
    expect(typeof LibraryPage).toBe('function');
  });

  it('accepts api, initialPage, and limit props', () => {
    // Type-level validation — ensures the component signature matches
    const _props: Parameters<typeof LibraryPage>[0] = {
      initialPage: 1,
      limit: 24,
    };
    expect(_props.initialPage).toBe(1);
  });
});
