/**
 * Purpose: Verify the wishlist toggle button reflects membership and mutation state.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/docs/react/components/button
 *   - https://tanstack.com/query/latest/docs/framework/react/overview
 * Tests:
 *   - packages/storefront/src/components/wishlist/WishlistButton.test.tsx
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WishlistButton } from './WishlistButton';
import type { WishlistApi } from '../../types/wishlist';

const navigateMock = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  session: {
    user: {
      id: 'user-1',
      email: 'buyer@simket.test',
      name: 'Simket Buyer',
    },
    session: {
      id: 'session-1',
    },
  } as {
    user: {
      id: string;
      email: string;
      name: string;
    };
    session: {
      id: string;
    };
  } | null,
  isVendureReady: true,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/product/shader-starter-kit' }),
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => authState,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: React.PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function createApi(inWishlist = false): WishlistApi {
  let membership = inWishlist;

  return {
    listWishlist: vi.fn(async () => ({ items: [], totalItems: membership ? 1 : 0, page: 1, limit: 12 })),
    getWishlistCount: vi.fn(async () => (membership ? 1 : 0)),
    isInWishlist: vi.fn(async () => membership),
    addToWishlist: vi.fn(async ({ productId, notifyOnPriceDrop }) => {
      membership = true;
      return {
        id: 'wishlist-1',
        customerId: 'customer-1',
        productId,
        addedAt: '2025-02-14T10:00:00.000Z',
        notifyOnPriceDrop: Boolean(notifyOnPriceDrop),
        product: {
          id: productId,
          slug: 'shader-starter-kit',
          name: 'Shader Starter Kit',
          description: 'Build shader pipelines faster.',
          priceMin: 1999,
          priceMax: 1999,
          currencyCode: 'USD',
          heroImageUrl: null,
          heroTransparentUrl: null,
          creatorName: 'Alex Artist',
          tags: ['unity'],
          categorySlug: 'software',
        },
      };
    }),
    removeFromWishlist: vi.fn(async () => {
      membership = false;
      return true;
    }),
  };
}

describe('WishlistButton', () => {
  it('adds products to the wishlist', async () => {
    authState.session = {
      user: {
        id: 'user-1',
        email: 'buyer@simket.test',
        name: 'Simket Buyer',
      },
      session: {
        id: 'session-1',
      },
    };
    authState.isVendureReady = true;
    const api = createApi(false);
    const user = userEvent.setup();

    render(<WishlistButton api={api} productId="product-1" />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /add to wishlist/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /remove from wishlist/i })).toBeInTheDocument(),
    );
    expect(api.addToWishlist).toHaveBeenCalledWith({
      productId: 'product-1',
      notifyOnPriceDrop: false,
    });
  });

  it('removes products already in the wishlist', async () => {
    authState.session = {
      user: {
        id: 'user-1',
        email: 'buyer@simket.test',
        name: 'Simket Buyer',
      },
      session: {
        id: 'session-1',
      },
    };
    authState.isVendureReady = true;
    const api = createApi(true);
    const user = userEvent.setup();

    render(<WishlistButton api={api} productId="product-1" />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /remove from wishlist/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /remove from wishlist/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument(),
    );
    expect(api.removeFromWishlist).toHaveBeenCalledWith('product-1');
  });

  it('redirects guests to sign-in instead of calling the wishlist API', async () => {
    authState.session = null;
    authState.isVendureReady = false;
    navigateMock.mockReset();
    const api = createApi(false);
    const user = userEvent.setup();

    render(<WishlistButton api={api} productId="product-1" />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /add to wishlist/i }));

    expect(api.isInWishlist).not.toHaveBeenCalled();
    expect(api.addToWishlist).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/sign-in', {
      state: { from: '/product/shader-starter-kit' },
    });
  });
});
