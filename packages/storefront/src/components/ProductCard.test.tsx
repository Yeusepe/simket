/**
 * Tests for ProductCard component.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 * External references:
 *   - https://heroui.com/docs/components/card
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { makeProductListItem, resetProductCounter } from '../types/product.factory';
import type { WishlistApi } from '../types/wishlist';

function renderWithRouter(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function createWishlistApi(): WishlistApi {
  return {
    listWishlist: async () => ({ items: [], totalItems: 0, page: 1, limit: 12 }),
    getWishlistCount: async () => 0,
    isInWishlist: async () => false,
    addToWishlist: async ({ productId }) => ({
      id: `wishlist-${productId}`,
      customerId: 'customer-1',
      productId,
      addedAt: '2025-02-14T10:00:00.000Z',
      notifyOnPriceDrop: false,
      product: makeProductListItem({ id: productId }),
    }),
    removeFromWishlist: async () => true,
  };
}

describe('ProductCard', () => {
  beforeEach(() => {
    resetProductCounter();
  });

  it('renders product name', () => {
    const product = makeProductListItem({ name: 'Epic Digital Art Pack' });
    renderWithRouter(<ProductCard product={product} wishlistApi={createWishlistApi()} />);
    expect(screen.getByText('Epic Digital Art Pack')).toBeInTheDocument();
  });

  it('renders creator name', () => {
    const product = makeProductListItem({ creatorName: 'Jane Artist' });
    renderWithRouter(<ProductCard product={product} wishlistApi={createWishlistApi()} />);
    expect(screen.getByText('Jane Artist')).toBeInTheDocument();
  });

  it('formats price in dollars from minor units', () => {
    const product = makeProductListItem({ priceMin: 1999, priceMax: 1999, currencyCode: 'USD' });
    renderWithRouter(<ProductCard product={product} wishlistApi={createWishlistApi()} />);
    expect(screen.getByText('$19.99')).toBeInTheDocument();
  });

  it('shows price range when min !== max', () => {
    const product = makeProductListItem({ priceMin: 500, priceMax: 2500, currencyCode: 'USD' });
    renderWithRouter(<ProductCard product={product} wishlistApi={createWishlistApi()} />);
    expect(screen.getByText('$5.00 – $25.00')).toBeInTheDocument();
  });

  it('renders hero image when URL is provided', () => {
    const product = makeProductListItem({ heroImageUrl: 'https://cdn.example.com/hero.webp' });
    renderWithRouter(<ProductCard product={product} wishlistApi={createWishlistApi()} />);
    const img = screen.getByRole('img', { name: product.name });
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/hero.webp');
  });

  it('renders placeholder when hero image is null', () => {
    const product = makeProductListItem({ heroImageUrl: null });
    renderWithRouter(<ProductCard product={product} wishlistApi={createWishlistApi()} />);
    expect(screen.getByTestId('product-card-placeholder')).toBeInTheDocument();
  });

  it('links to product detail page via slug', () => {
    const product = makeProductListItem({ slug: 'my-cool-product' });
    renderWithRouter(<ProductCard product={product} wishlistApi={createWishlistApi()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/product/my-cool-product');
  });

  it('supports a store-scoped href override', () => {
    const product = makeProductListItem({ slug: 'my-cool-product' });
    renderWithRouter(
      <ProductCard
        product={product}
        href="/store/alex-artist/product/my-cool-product"
        wishlistApi={createWishlistApi()}
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/store/alex-artist/product/my-cool-product',
    );
  });

  it('renders tags as chips', () => {
    const product = makeProductListItem({ tags: ['unity', 'game-asset'] });
    renderWithRouter(<ProductCard product={product} wishlistApi={createWishlistApi()} />);
    expect(screen.getByText('unity')).toBeInTheDocument();
    expect(screen.getByText('game-asset')).toBeInTheDocument();
  });

  it('renders a wishlist toggle button by default', () => {
    const product = makeProductListItem();
    renderWithRouter(<ProductCard product={product} wishlistApi={createWishlistApi()} />);

    expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument();
  });
});

describe('ProductCardSkeleton', () => {
  it('renders skeleton loading state', () => {
    renderWithRouter(<ProductCardSkeleton />);
    expect(screen.getByTestId('product-card-skeleton')).toBeInTheDocument();
  });
});
