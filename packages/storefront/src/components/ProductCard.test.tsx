/**
 * Tests for ProductCard component.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 * External references:
 *   - https://heroui.com/docs/components/card
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { makeProductListItem, resetProductCounter } from '../types/product.factory';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ProductCard', () => {
  beforeEach(() => {
    resetProductCounter();
  });

  it('renders product name', () => {
    const product = makeProductListItem({ name: 'Epic Digital Art Pack' });
    renderWithRouter(<ProductCard product={product} />);
    expect(screen.getByText('Epic Digital Art Pack')).toBeInTheDocument();
  });

  it('renders creator name', () => {
    const product = makeProductListItem({ creatorName: 'Jane Artist' });
    renderWithRouter(<ProductCard product={product} />);
    expect(screen.getByText('Jane Artist')).toBeInTheDocument();
  });

  it('formats price in dollars from minor units', () => {
    const product = makeProductListItem({ priceMin: 1999, priceMax: 1999, currencyCode: 'USD' });
    renderWithRouter(<ProductCard product={product} />);
    expect(screen.getByText('$19.99')).toBeInTheDocument();
  });

  it('shows price range when min !== max', () => {
    const product = makeProductListItem({ priceMin: 500, priceMax: 2500, currencyCode: 'USD' });
    renderWithRouter(<ProductCard product={product} />);
    expect(screen.getByText('$5.00 – $25.00')).toBeInTheDocument();
  });

  it('renders hero image when URL is provided', () => {
    const product = makeProductListItem({ heroImageUrl: 'https://cdn.example.com/hero.webp' });
    renderWithRouter(<ProductCard product={product} />);
    const img = screen.getByRole('img', { name: product.name });
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/hero.webp');
  });

  it('renders placeholder when hero image is null', () => {
    const product = makeProductListItem({ heroImageUrl: null });
    renderWithRouter(<ProductCard product={product} />);
    expect(screen.getByTestId('product-card-placeholder')).toBeInTheDocument();
  });

  it('links to product detail page via slug', () => {
    const product = makeProductListItem({ slug: 'my-cool-product' });
    renderWithRouter(<ProductCard product={product} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/product/my-cool-product');
  });

  it('supports a store-scoped href override', () => {
    const product = makeProductListItem({ slug: 'my-cool-product' });
    renderWithRouter(
      <ProductCard product={product} href="/store/alex-artist/product/my-cool-product" />,
    );

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/store/alex-artist/product/my-cool-product',
    );
  });

  it('renders tags as chips', () => {
    const product = makeProductListItem({ tags: ['unity', 'game-asset'] });
    renderWithRouter(<ProductCard product={product} />);
    expect(screen.getByText('unity')).toBeInTheDocument();
    expect(screen.getByText('game-asset')).toBeInTheDocument();
  });
});

describe('ProductCardSkeleton', () => {
  it('renders skeleton loading state', () => {
    renderWithRouter(<ProductCardSkeleton />);
    expect(screen.getByTestId('product-card-skeleton')).toBeInTheDocument();
  });
});
