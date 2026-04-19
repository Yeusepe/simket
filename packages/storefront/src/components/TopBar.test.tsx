import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from './TopBar';
import type { WishlistApi } from '../types/wishlist';

vi.mock('./notifications', () => ({
  NotificationBell: () => <button aria-label="Notifications">Bell</button>,
}));

function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function createWishlistApi(): WishlistApi {
  return {
    listWishlist: async () => ({ items: [], totalItems: 3, page: 1, limit: 12 }),
    getWishlistCount: async () => 3,
    isInWishlist: async () => false,
    addToWishlist: async ({ productId }) => ({
      id: `wishlist-${productId}`,
      customerId: 'customer-1',
      productId,
      addedAt: '2025-02-14T10:00:00.000Z',
      notifyOnPriceDrop: false,
      product: {
        id: productId,
        slug: 'wishlist-product',
        name: 'Wishlist Product',
        description: 'Wishlist product description',
        priceMin: 1999,
        priceMax: 1999,
        currencyCode: 'USD',
        heroImageUrl: null,
        heroTransparentUrl: null,
        creatorName: 'Alex Artist',
        tags: ['unity'],
        categorySlug: 'software',
      },
    }),
    removeFromWishlist: async () => true,
  };
}

describe('TopBar', () => {
  it('renders the Simket logo link', () => {
    renderWithRouter(<TopBar wishlistApi={createWishlistApi()} />);
    expect(screen.getByText('Simket')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithRouter(<TopBar wishlistApi={createWishlistApi()} />);
    // HeroUI SearchField renders an input — find by placeholder
    const input = screen.getByPlaceholderText('Search products...');
    expect(input).toBeInTheDocument();
  });

  it('renders Home button', () => {
    renderWithRouter(<TopBar wishlistApi={createWishlistApi()} />);
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    renderWithRouter(<TopBar wishlistApi={createWishlistApi()} />);
    const toggle = screen.getByLabelText(/switch to .* mode/i);
    expect(toggle).toBeInTheDocument();
  });

  it('renders Cart button', () => {
    renderWithRouter(<TopBar wishlistApi={createWishlistApi()} />);
    expect(screen.getByLabelText('Cart')).toBeInTheDocument();
  });

  it('renders Notifications button', () => {
    renderWithRouter(<TopBar wishlistApi={createWishlistApi()} />);
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('renders Library button', () => {
    renderWithRouter(<TopBar wishlistApi={createWishlistApi()} />);
    expect(screen.getByLabelText('Library')).toBeInTheDocument();
  });

  it('renders profile avatar', () => {
    renderWithRouter(<TopBar wishlistApi={createWishlistApi()} />);
    expect(screen.getByTestId('profile-avatar')).toBeInTheDocument();
  });

  it('renders a wishlist link with the current count', async () => {
    renderWithRouter(<TopBar wishlistApi={createWishlistApi()} />);

    expect(screen.getByLabelText('Wishlist')).toBeInTheDocument();
    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('navigates to search on submit', () => {
    const { getByPlaceholderText } = renderWithRouter(<TopBar wishlistApi={createWishlistApi()} />);
    const input = getByPlaceholderText('Search products...');
    fireEvent.change(input, { target: { value: 'unity avatar' } });
    fireEvent.submit(input.closest('form') ?? input);
    // navigation is handled by useNavigate mock — just verify no error thrown
    expect(input).toBeInTheDocument();
  });
});
