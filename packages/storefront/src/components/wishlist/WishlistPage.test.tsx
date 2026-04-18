/**
 * Purpose: Verify wishlist page rendering, empty states, pagination, and removal actions.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/docs/react/components/card
 *   - https://heroui.com/docs/react/components/button
 *   - https://tanstack.com/query/latest/docs/framework/react/overview
 * Tests:
 *   - packages/storefront/src/components/wishlist/WishlistPage.test.tsx
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { WishlistPage } from './WishlistPage';
import type { WishlistApi, WishlistPage as WishlistPageData } from '../../types/wishlist';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: React.PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function createWishlistPage(overrides: Partial<WishlistPageData> = {}): WishlistPageData {
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

function createApi(pageOne = createWishlistPage()): WishlistApi {
  let currentPage = pageOne;

  return {
    listWishlist: vi.fn(async ({ page }) => {
      if (page === 2) {
        return createWishlistPage({
          page: 2,
          totalItems: 2,
          items: [{
            id: 'wishlist-2',
            customerId: 'customer-1',
            productId: 'product-2',
            addedAt: '2025-02-15T10:00:00.000Z',
            notifyOnPriceDrop: true,
            product: {
              id: 'product-2',
              slug: 'lighting-toolkit',
              name: 'Lighting Toolkit',
              description: 'Ship richer scenes faster.',
              priceMin: 2999,
              priceMax: 2999,
              currencyCode: 'USD',
              heroImageUrl: null,
              heroTransparentUrl: null,
              creatorName: 'Jamie Tools',
              tags: ['tooling'],
              categorySlug: 'software',
            },
          }],
        });
      }

      return currentPage;
    }),
    getWishlistCount: vi.fn(async () => currentPage.totalItems),
    isInWishlist: vi.fn(async (productId: string) =>
      currentPage.items.some((item) => item.productId === productId)),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(async (productId: string) => {
      currentPage = {
        ...currentPage,
        items: currentPage.items.filter((item) => item.productId !== productId),
        totalItems: Math.max(0, currentPage.totalItems - 1),
      };
      return true;
    }),
  };
}

describe('WishlistPage', () => {
  it('renders wishlist products and removes them', async () => {
    const api = createApi();
    const user = userEvent.setup();

    render(<WishlistPage api={api} initialPage={1} limit={1} />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /your wishlist/i })).toBeInTheDocument(),
    );
    expect(screen.getByText('Shader Starter Kit')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove shader starter kit from wishlist/i }));

    await waitFor(() =>
      expect(screen.getByText(/your wishlist is empty/i)).toBeInTheDocument(),
    );
  });

  it('supports pagination and empty states', async () => {
    const api = createApi(createWishlistPage({ items: [], totalItems: 2 }));
    const user = userEvent.setup();

    render(<WishlistPage api={api} initialPage={1} limit={1} />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText(/your wishlist is empty/i)).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /next page/i }));

    await waitFor(() =>
      expect(screen.getByText('Lighting Toolkit')).toBeInTheDocument(),
    );
  });
});
