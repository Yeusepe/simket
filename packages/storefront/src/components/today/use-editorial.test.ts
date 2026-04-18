/**
 * Purpose: Verify the Today editorial hook loads data, auto-refreshes from the
 * editorial update feed, and supports retry-driven refetches.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://react.dev/reference/react/useEffect
 * Tests:
 *   - packages/storefront/src/components/today/use-editorial.test.ts
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorial } from './use-editorial';

function makeJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const collectionsResponse = {
  collections: [
    {
      id: 'section-grid',
      name: 'Grid',
      slug: 'grid',
      layout: 'card-grid-4',
      sortOrder: 1,
      items: [],
      featuredProducts: [],
    },
    {
      id: 'section-hero',
      name: 'Hero',
      slug: 'hero',
      layout: 'hero-banner',
      sortOrder: 2,
      items: [
        {
          id: 'article-1',
          title: 'Launch Day',
          slug: 'launch-day',
          excerpt: 'Short summary',
          heroImage: 'https://cdn.example.com/hero.jpg',
          heroTransparent: 'https://cdn.example.com/hero-transparent.png',
          author: 'Editorial Team',
          publishedAt: '2026-01-02T00:00:00.000Z',
          tags: ['launch'],
        },
      ],
      featuredProducts: [],
    },
  ],
};

const refreshedCollectionsResponse = {
  collections: [
    {
      id: 'section-hero',
      name: 'Hero',
      slug: 'hero',
      layout: 'hero-banner',
      sortOrder: 1,
      items: [
        {
          id: 'article-2',
          title: 'Fresh Story',
          slug: 'fresh-story',
          excerpt: 'Fresh summary',
          heroImage: 'https://cdn.example.com/fresh.jpg',
          author: 'Editorial Team',
          publishedAt: '2026-01-03T00:00:00.000Z',
          tags: ['fresh'],
        },
      ],
      featuredProducts: [],
    },
  ],
};

describe('useEditorial', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    cleanup();
  });

  it('loads curated collections from the vendure-server editorial endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse(collectionsResponse))
      .mockResolvedValueOnce(makeJsonResponse({ hasUpdate: false, version: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    const { result, unmount } = renderHook(() => useEditorial());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sections.map((section) => section.name)).toEqual(['Grid', 'Hero']);
    expect(result.current.sections[1]?.items[0]?.heroTransparent).toBe(
      'https://cdn.example.com/hero-transparent.png',
    );
    expect(result.current.version).toBe(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pathname: '/editorial/collections' }),
      expect.any(Object),
    );
    unmount();
  });

  it('surfaces fetch errors', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Failed to load editorial data'));
    vi.stubGlobal('fetch', fetchMock);

    const { result, unmount } = renderHook(() => useEditorial());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.sections).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    unmount();
  });

  it('refetches after an error', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('Temporary outage'))
      .mockResolvedValueOnce(makeJsonResponse({ hasUpdate: false, version: 0 }))
      .mockResolvedValueOnce(makeJsonResponse(collectionsResponse))
      .mockResolvedValueOnce(makeJsonResponse({ hasUpdate: false, version: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    const { result, unmount } = renderHook(() => useEditorial());

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
    unmount();
  });

  it('polls for update versions, auto-refreshes content, and exposes the new-content indicator', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeJsonResponse(collectionsResponse))
      .mockResolvedValueOnce(makeJsonResponse({ hasUpdate: false, version: 1 }))
      .mockResolvedValueOnce(
        makeJsonResponse({
          hasUpdate: true,
          version: 2,
          update: { version: 2, collection: 'articles' },
        }),
      )
      .mockResolvedValueOnce(makeJsonResponse(refreshedCollectionsResponse))
      .mockResolvedValueOnce(makeJsonResponse({ hasUpdate: true, version: 2 }));
    vi.stubGlobal('fetch', fetchMock);

    const { result, unmount } = renderHook(() => useEditorial({ pollIntervalMs: 1_000 }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_100);
    });

    expect(result.current.sections[0]?.items[0]?.title).toBe('Fresh Story');

    expect(result.current.version).toBe(2);
    expect(result.current.hasFreshContent).toBe(true);

    act(() => {
      result.current.dismissFreshContent();
    });

    expect(result.current.hasFreshContent).toBe(false);
    unmount();
  });
});
