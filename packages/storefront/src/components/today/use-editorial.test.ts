/**
 * Purpose: Verify the Today editorial hook loads data, surfaces failures, and
 * supports retry-driven refetches.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://react.dev/reference/react/useEffect
 * Tests:
 *   - packages/storefront/src/components/today/use-editorial.test.ts
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEditorial } from './use-editorial';

function makeJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const sectionsResponse = {
  docs: [
    {
      id: 'section-hero',
      name: 'Hero',
      slug: 'hero',
      description: 'Top story',
      layout: 'hero-banner',
      sortOrder: 2,
      isActive: true,
    },
    {
      id: 'section-grid',
      name: 'Grid',
      slug: 'grid',
      description: 'Grid stories',
      layout: 'card-grid-4',
      sortOrder: 1,
      isActive: true,
    },
  ],
  hasNextPage: false,
  hasPrevPage: false,
  limit: 10,
  page: 1,
  pagingCounter: 1,
  totalDocs: 2,
  totalPages: 1,
};

const articlesResponse = {
  docs: [
    {
      id: 'article-1',
      title: 'Launch Day',
      slug: 'launch-day',
      excerpt: 'Short summary',
      content: { root: { children: [] } },
      heroImage: { id: 'media-1', url: 'https://cdn.example.com/hero.jpg', filename: 'hero.jpg' },
      heroTransparent: {
        id: 'media-2',
        url: 'https://cdn.example.com/hero-transparent.png',
        filename: 'hero-transparent.png',
      },
      author: 'Editorial Team',
      publishedAt: '2026-01-02T00:00:00.000Z',
      status: 'published',
      tags: ['launch'],
      featuredProducts: [],
      section: {
        id: 'section-hero',
        name: 'Hero',
        slug: 'hero',
        description: 'Top story',
        layout: 'hero-banner',
        sortOrder: 2,
        isActive: true,
      },
    },
  ],
  hasNextPage: false,
  hasPrevPage: false,
  limit: 100,
  page: 1,
  pagingCounter: 1,
  totalDocs: 1,
  totalPages: 1,
};

describe('useEditorial', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads today sections and maps articles into section items', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse(sectionsResponse))
      .mockResolvedValueOnce(makeJsonResponse(articlesResponse));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEditorial());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sections.map((section) => section.name)).toEqual(['Grid', 'Hero']);
    expect(result.current.sections[1]?.items[0]?.heroTransparent).toBe(
      'https://cdn.example.com/hero-transparent.png',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces fetch errors', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Failed to load editorial data'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEditorial());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.sections).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('refetches after an error', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('Temporary outage'))
      .mockRejectedValueOnce(new Error('Temporary outage'))
      .mockResolvedValueOnce(makeJsonResponse(sectionsResponse))
      .mockResolvedValueOnce(makeJsonResponse(articlesResponse));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEditorial());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.sections).toHaveLength(2);
    });

    expect(result.current.error).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
