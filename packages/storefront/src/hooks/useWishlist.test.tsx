/**
 * Purpose: Verify wishlist query caching, optimistic updates, and page hydration.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://tanstack.com/query/latest/docs/framework/react/overview
 *   - https://testing-library.com/docs/react-testing-library/api/#renderhook
 * Tests:
 *   - packages/storefront/src/hooks/useWishlist.test.tsx
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWishlist } from './useWishlist';
import type { WishlistApi, WishlistPage } from '../types/wishlist';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return {
    queryClient,
    wrapper: ({ children }: React.PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

function createWishlistPage(overrides: Partial<WishlistPage> = {}): WishlistPage {
  return {
    items: [{
      id: 'wishlist-1',
      customerId: 'customer-1',
      productId: 'product-1',
      addedAt: '2025-02-14T10:00:00.000Z',
      notifyOnPriceDrop: false,
      product: {
        id: 'product-1',
        slug: 'shader-starter-kit',
        name: 'Shader Starter Kit',
        description: 'Build shader pipelines faster.',
        priceMin: 1999,
        priceMax: 1999,
        currencyCode: 'USD',
        heroImageUrl: 'https://cdn.example.com/shader.webp',
        heroTransparentUrl: null,
        creatorName: 'Alex Artist',
        tags: ['unity'],
        categorySlug: 'software',
      },
    }],
    totalItems: 1,
    page: 1,
    limit: 12,
    ...overrides,
  };
}

function createApi(page = createWishlistPage()): WishlistApi {
  let currentPage = page;
  const membership = new Set(currentPage.items.map((item) => item.productId));

  return {
    listWishlist: vi.fn(async () => currentPage),
    getWishlistCount: vi.fn(async () => membership.size),
    isInWishlist: vi.fn(async (productId: string) => membership.has(productId)),
    addToWishlist: vi.fn(async ({ productId, notifyOnPriceDrop }) => {
      membership.add(productId);
      const item = {
        id: `wishlist-${productId}`,
        customerId: 'customer-1',
        productId,
        addedAt: '2025-02-15T10:00:00.000Z',
        notifyOnPriceDrop: Boolean(notifyOnPriceDrop),
        product: {
          id: productId,
          slug: `${productId}-slug`,
          name: `Product ${productId}`,
          description: `Description for ${productId}`,
          priceMin: 2499,
          priceMax: 2499,
          currencyCode: 'USD',
          heroImageUrl: null,
          heroTransparentUrl: null,
          creatorName: 'Simket Creator',
          tags: ['wishlist'],
          categorySlug: 'software',
        },
      };
      currentPage = {
        ...currentPage,
        items: [item, ...currentPage.items.filter((entry) => entry.productId !== productId)],
        totalItems: membership.size,
      };
      return item;
    }),
    removeFromWishlist: vi.fn(async (productId: string) => {
      membership.delete(productId);
      currentPage = {
        ...currentPage,
        items: currentPage.items.filter((entry) => entry.productId !== productId),
        totalItems: membership.size,
      };
      return true;
    }),
  };
}

describe('useWishlist', () => {
  it('loads the current page, count, and membership state', async () => {
    const api = createApi();
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useWishlist({ api, page: 1, limit: 12, productId: 'product-1' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.wishlist.items).toHaveLength(1);
    expect(result.current.wishlistCount).toBe(1);
    expect(result.current.currentProductInWishlist).toBe(true);
    expect(result.current.isInWishlist('product-1')).toBe(true);
  });

  it('optimistically adds and removes wishlist items', async () => {
    const api = createApi(createWishlistPage({ items: [], totalItems: 0 }));
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useWishlist({ api, page: 1, limit: 12, productId: 'product-9' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addToWishlist('product-9', true);
    });

    await waitFor(() => {
      expect(result.current.currentProductInWishlist).toBe(true);
      expect(result.current.wishlistCount).toBe(1);
      expect(result.current.wishlist.items[0]?.productId).toBe('product-9');
    });

    await act(async () => {
      await result.current.removeFromWishlist('product-9');
    });

    await waitFor(() => {
      expect(result.current.currentProductInWishlist).toBe(false);
      expect(result.current.wishlistCount).toBe(0);
      expect(result.current.wishlist.items).toHaveLength(0);
    });
  });
});
