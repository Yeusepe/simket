/**
 * Tests for useProductListing hook.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/queries/#products
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProductListing } from './use-product-listing';
import type { ProductListingFetcher } from './use-product-listing';
import {
  makeProductListingResponse,
  resetProductCounter,
} from '../types/product.factory';

function makeFetcher(response = makeProductListingResponse(12, 48)): ProductListingFetcher {
  return vi.fn().mockResolvedValue(response);
}

describe('useProductListing', () => {
  beforeEach(() => {
    resetProductCounter();
  });

  it('fetches products on mount', async () => {
    const fetcher = makeFetcher();
    const { result } = renderHook(() =>
      useProductListing({ fetcher }),
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.products.items).toHaveLength(12);
    expect(result.current.products.totalItems).toBe(48);
    expect(result.current.error).toBeNull();
  });

  it('calculates totalPages correctly', async () => {
    const fetcher = makeFetcher(makeProductListingResponse(12, 50));
    const { result } = renderHook(() =>
      useProductListing({ fetcher, perPage: 24 }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // 50 items / 24 per page = ceil(2.08) = 3 pages
    expect(result.current.totalPages).toBe(3);
  });

  it('re-fetches when page changes', async () => {
    const fetcher = makeFetcher();
    const { result } = renderHook(() =>
      useProductListing({ fetcher }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.page).toBe(2);
  });

  it('resets to page 1 when sort changes', async () => {
    const fetcher = makeFetcher();
    const { result } = renderHook(() =>
      useProductListing({ fetcher, initialPage: 3 }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setSort({ field: 'price', direction: 'ASC' });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.page).toBe(1);
    expect(result.current.sort).toEqual({ field: 'price', direction: 'ASC' });
  });

  it('resets to page 1 when filters change', async () => {
    const fetcher = makeFetcher();
    const { result } = renderHook(() =>
      useProductListing({ fetcher, initialPage: 2 }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFilters({ categorySlug: 'music' });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.page).toBe(1);
    expect(result.current.filters).toEqual({ categorySlug: 'music' });
  });

  it('sets error on fetch failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() =>
      useProductListing({ fetcher }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.products.items).toHaveLength(0);
  });

  it('provides facets from the response', async () => {
    const fetcher = makeFetcher();
    const { result } = renderHook(() =>
      useProductListing({ fetcher }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.facets).toHaveLength(2);
    expect(result.current.facets[0].name).toBe('Category');
  });

  it('passes correct params to fetcher', async () => {
    const fetcher = makeFetcher();
    renderHook(() =>
      useProductListing({
        fetcher,
        initialPage: 2,
        perPage: 12,
        initialSort: { field: 'price', direction: 'DESC' },
        initialFilters: { search: 'art', tags: ['unity'] },
      }),
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    expect(fetcher).toHaveBeenCalledWith({
      page: 2,
      perPage: 12,
      sort: { field: 'price', direction: 'DESC' },
      filters: { search: 'art', tags: ['unity'] },
    });
  });
});
