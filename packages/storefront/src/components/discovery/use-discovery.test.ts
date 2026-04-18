/**
 * Purpose: Verify the discovery hook loads initial results, appends more
 * recommendations, and reports errors/end-of-feed state.
 *
 * Governing docs:
 *   - docs/architecture.md (§6 storefront discovery)
 *   - docs/service-architecture.md (§1.2 Recommend service API)
 * External references:
 *   - https://react.dev/reference/react/useEffect
 *   - https://testing-library.com/docs/react-testing-library/api/#renderhook
 * Tests:
 *   - packages/storefront/src/components/discovery/use-discovery.test.ts
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  DiscoveryFeedItem,
  DiscoveryPage,
} from './discovery-types';
import { useDiscovery, type DiscoveryFetcher } from './use-discovery';

function makeDiscoveryItem(
  index: number,
  overrides: Partial<DiscoveryFeedItem> = {},
): DiscoveryFeedItem {
  return {
    productId: `product-${index}`,
    slug: `product-${index}`,
    name: `Discovery Product ${index}`,
    imageUrl: `https://cdn.example.com/products/${index}.webp`,
    price: 999 + index,
    currencyCode: 'USD',
    creatorName: `Creator ${index}`,
    reason: `Because you bought Collection ${index}`,
    score: 1 - index / 100,
    source: 'purchase-history',
    variantId: `variant-${index}`,
    ...overrides,
  };
}

function page(
  items: readonly DiscoveryFeedItem[],
  nextCursor?: string,
): DiscoveryPage {
  return {
    items,
    nextCursor,
    totalEstimate: items.length + (nextCursor ? 1 : 0),
  };
}

describe('useDiscovery', () => {
  it('loads the first page on mount', async () => {
    const fetcher: DiscoveryFetcher = vi.fn(async () =>
      page([makeDiscoveryItem(1), makeDiscoveryItem(2)], 'cursor-2'),
    );

    const { result } = renderHook(() =>
      useDiscovery('user-1', { fetcher, pageSize: 2 }),
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetcher).toHaveBeenCalledWith({
      userId: 'user-1',
      pageSize: 2,
      cursor: undefined,
      excludeIds: [],
    });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.hasMore).toBe(true);
  });

  it('appends items when loadMore is called', async () => {
    const fetcher: DiscoveryFetcher = vi
      .fn()
      .mockResolvedValueOnce(page([makeDiscoveryItem(1)], 'cursor-1'))
      .mockResolvedValueOnce(page([makeDiscoveryItem(2)], undefined));

    const { result } = renderHook(() =>
      useDiscovery('user-1', { fetcher, pageSize: 1 }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items.map((item) => item.productId)).toEqual([
      'product-1',
      'product-2',
    ]);
    expect(fetcher).toHaveBeenLastCalledWith({
      userId: 'user-1',
      pageSize: 1,
      cursor: 'cursor-1',
      excludeIds: ['product-1'],
    });
  });

  it('captures fetch errors and retries the failed request', async () => {
    const fetcher: DiscoveryFetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce(page([makeDiscoveryItem(1)], undefined));

    const { result } = renderHook(() =>
      useDiscovery('user-1', { fetcher, pageSize: 2 }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toBe('Network down');

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });
    expect(result.current.error).toBeNull();
  });

  it('marks the feed as complete when no next cursor is returned', async () => {
    const fetcher: DiscoveryFetcher = vi.fn(async () =>
      page([makeDiscoveryItem(1), makeDiscoveryItem(2)], undefined),
    );

    const { result } = renderHook(() =>
      useDiscovery('user-1', { fetcher, pageSize: 2 }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasMore).toBe(false);
  });
});
