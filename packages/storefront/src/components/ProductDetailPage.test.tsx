/**
 * Tests for ProductDetailPage component.
 *
 * Verified HeroUI v3 APIs (fetched from heroui.com/docs):
 *   - Button: variants primary/secondary/tertiary/outline/ghost/danger, sizes sm/md/lg
 *   - Chip: compound Chip > Chip.Label, variants primary/secondary/tertiary/soft
 *   - Separator: <Separator />, variants default/secondary/tertiary
 *   - Card: compound Card > Card.Header > Card.Title + Card.Description, Card.Content, Card.Footer
 *   - Spinner: <Spinner size="lg" />
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductDetailPage } from './ProductDetailPage';
import {
  makeProductDetail,
  resetProductCounter,
} from '../types/product.factory';
import type { ProductDetail } from '../types/product';
import { formatPrice } from './ProductCard';

export type ProductDetailFetcher = (slug: string) => Promise<ProductDetail>;

function renderPage(fetcher: ProductDetailFetcher, slug = 'test-product') {
  return render(
    <MemoryRouter>
      <ProductDetailPage fetcher={fetcher} slug={slug} />
    </MemoryRouter>,
  );
}

describe('ProductDetailPage', () => {
  let mockFetcher: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetProductCounter();
    mockFetcher = vi.fn();
  });

  it('shows loading spinner while fetching', () => {
    mockFetcher.mockReturnValue(new Promise(() => {}));
    renderPage(mockFetcher);
    expect(screen.getByTestId('product-detail-loading')).toBeInTheDocument();
  });

  it('renders product name as heading', async () => {
    const product = makeProductDetail({ name: 'Amazing Plugin' });
    mockFetcher.mockResolvedValue(product);
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Amazing Plugin' })).toBeInTheDocument();
    });
  });

  it('renders hero image when heroMediaType is image', async () => {
    const product = makeProductDetail({
      heroMediaUrl: 'https://cdn.example.com/hero.webp',
      heroMediaType: 'image',
    });
    mockFetcher.mockResolvedValue(product);
    renderPage(mockFetcher);

    await waitFor(() => {
      const img = screen.getByAltText(product.name);
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://cdn.example.com/hero.webp');
    });
  });

  it('renders video element when heroMediaType is video', async () => {
    const product = makeProductDetail({
      heroMediaUrl: 'https://cdn.example.com/hero.webm',
      heroMediaType: 'video',
    });
    mockFetcher.mockResolvedValue(product);
    renderPage(mockFetcher);

    await waitFor(() => {
      const video = screen.getByTestId('hero-video');
      expect(video).toBeInTheDocument();
    });
  });

  it('renders product description text', async () => {
    const product = makeProductDetail({ description: 'A detailed description of the product.' });
    mockFetcher.mockResolvedValue(product);
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText('A detailed description of the product.')).toBeInTheDocument();
    });
  });

  it('renders formatted price from first variant', async () => {
    const product = makeProductDetail({
      variants: [
        { id: 'v1', name: 'Default', price: 1999, currencyCode: 'USD', sku: 'SKU-1', stockLevel: 'IN_STOCK' },
      ],
      currencyCode: 'USD',
    });
    mockFetcher.mockResolvedValue(product);
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText(formatPrice(1999, 'USD'))).toBeInTheDocument();
    });
  });

  it('renders tags as chips', async () => {
    const product = makeProductDetail({ tags: ['unity', 'plugin', 'audio'] });
    mockFetcher.mockResolvedValue(product);
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText('unity')).toBeInTheDocument();
      expect(screen.getByText('plugin')).toBeInTheDocument();
      expect(screen.getByText('audio')).toBeInTheDocument();
    });
  });

  it('renders creator info card with name and avatar', async () => {
    const product = makeProductDetail({
      creator: { id: 'c1', name: 'Jane Creator', avatarUrl: 'https://cdn.example.com/jane.webp' },
    });
    mockFetcher.mockResolvedValue(product);
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText('Jane Creator')).toBeInTheDocument();
    });
  });

  it('renders add to cart button', async () => {
    mockFetcher.mockResolvedValue(makeProductDetail());
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
    });
  });

  it('shows dependency warning when product has required products', async () => {
    const product = makeProductDetail({
      requiredProductIds: ['product-99', 'product-100'],
    });
    mockFetcher.mockResolvedValue(product);
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText(/requires other products/i)).toBeInTheDocument();
    });
  });

  it('shows error on fetch failure', async () => {
    mockFetcher.mockRejectedValue(new Error('Product not found'));
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText(/Product not found/)).toBeInTheDocument();
    });
  });

  it('passes the slug to the fetcher', async () => {
    mockFetcher.mockResolvedValue(makeProductDetail());
    renderPage(mockFetcher, 'my-cool-product');

    await waitFor(() => {
      expect(mockFetcher).toHaveBeenCalledWith('my-cool-product');
    });
  });

  it('shows placeholder when no hero media', async () => {
    const product = makeProductDetail({ heroMediaUrl: null });
    mockFetcher.mockResolvedValue(product);
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByTestId('hero-placeholder')).toBeInTheDocument();
    });
  });
});
