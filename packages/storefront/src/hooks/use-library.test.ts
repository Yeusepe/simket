/**
 * Purpose: Unit tests for useLibrary hook.
 */
import { describe, it, expect, vi } from 'vitest';
import { useLibrary, type LibraryApi, type LibraryState } from './use-library';

// Test the hook's initial state without rendering
describe('useLibrary', () => {
  it('exports the hook function', () => {
    expect(typeof useLibrary).toBe('function');
  });

  it('LibraryApi interface can be satisfied', () => {
    const mockApi: LibraryApi = {
      fetchLibrary: vi.fn().mockResolvedValue({
        items: [],
        totalItems: 0,
        page: 1,
        limit: 12,
      } satisfies LibraryState),
    };
    expect(mockApi.fetchLibrary).toBeDefined();
  });
});
