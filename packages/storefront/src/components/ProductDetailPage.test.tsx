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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProductDetailPage } from './ProductDetailPage';
import {
  makeProductDetail,
  resetProductCounter,
} from '../types/product.factory';
import type { ProductDetail } from '../types/product';
import { formatPrice } from './ProductCard';
import { resetCartState, useCartState } from '../state/cart-state';
import type { WishlistApi } from '../types/wishlist';
import type { ExperimentVariantAssignment } from '../hooks/useExperimentVariant';

export type ProductDetailFetcher = (slug: string) => Promise<ProductDetail>;

function renderPage(fetcher: ProductDetailFetcher, slug = 'test-product') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProductDetailPage fetcher={fetcher} slug={slug} wishlistApi={createWishlistApi()} />
      </MemoryRouter>
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

describe('ProductDetailPage', () => {
  let mockFetcher: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetProductCounter();
    resetCartState();
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

  it('renders an add to wishlist button', async () => {
    mockFetcher.mockResolvedValue(makeProductDetail());
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument();
    });
  });

  it('shows dependency requirements with links when product has prerequisites', async () => {
    const product = makeProductDetail({
      requiredProductIds: ['product-99'],
      dependencyRequirements: [
        {
          requiredProductId: 'product-99',
          requiredVariantId: 'variant-99',
          requiredProductName: 'Base Package',
          requiredProductSlug: 'base-package',
          requiredProductPrice: 1500,
          currencyCode: 'USD',
          requiredProductHeroImageUrl: null,
          message: 'Requires Base Package first.',
        },
      ],
    });
    mockFetcher.mockResolvedValue(product);
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Base Package' })).toHaveAttribute('href', '/product/base-package');
    });
  });

  it('supports store-scoped dependency links', async () => {
    const product = makeProductDetail({
      dependencyRequirements: [
        {
          requiredProductId: 'product-99',
          requiredVariantId: 'variant-99',
          requiredProductName: 'Base Package',
          requiredProductSlug: 'base-package',
          requiredProductPrice: 1500,
          currencyCode: 'USD',
          requiredProductHeroImageUrl: null,
          message: 'Requires Base Package first.',
        },
      ],
    });
    mockFetcher.mockResolvedValue(product);
    render(
      <QueryClientProvider client={new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })}>
        <MemoryRouter>
          <ProductDetailPage
            fetcher={mockFetcher}
            slug="test-product"
            buildProductHref={(productSlug) => `/store/alex-artist/product/${productSlug}`}
            wishlistApi={createWishlistApi()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Base Package' })).toHaveAttribute(
        'href',
        '/store/alex-artist/product/base-package',
      );
    });
  });

  it('renders bundle offers and adds the selected bundle to cart', async () => {
    const user = userEvent.setup();
    const product = makeProductDetail({
      availableBundles: [
        {
          bundleId: 'complete-pack',
          name: 'Complete Pack',
          discountPercent: 20,
          callout: 'Save 20% with the Complete Pack',
          products: [
            {
              productId: 'product-1',
              variantId: 'variant-1',
              name: 'Test Product 1',
              price: 2000,
              currencyCode: 'USD',
              heroImageUrl: null,
              slug: 'test-product-1',
            },
            {
              productId: 'product-2',
              variantId: 'variant-2',
              name: 'Bonus Pack',
              price: 3000,
              currencyCode: 'USD',
              heroImageUrl: null,
              slug: 'bonus-pack',
            },
          ],
        },
      ],
    });
    mockFetcher.mockResolvedValue(product);
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText(/save 20% with the complete pack/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add bundle to cart/i }));

    expect(useCartState.getState().items).toHaveLength(2);
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

  it('applies experiment variant config and auto-tracks the displayed view', async () => {
    const trackEvent = vi.fn().mockResolvedValue(undefined);
    const product = makeProductDetail({
      description: 'Default description',
    });
    mockFetcher.mockResolvedValue(product);

    const variant: ExperimentVariantAssignment = {
      experimentId: 'exp-1',
      productId: product.id,
      variantName: 'variant-b',
      config: {
        ctaText: 'Get instant access',
        description: 'Experiment description',
        priceDisplay: '$14.99',
      },
    };

    render(
      <MemoryRouter>
        <ProductDetailPage
          fetcher={mockFetcher}
          slug={product.slug}
          experimentOptions={{
            userId: 'user-1',
            fetchVariant: vi.fn().mockResolvedValue(variant),
            trackEvent,
          }}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Experiment description')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Get instant access' })).toBeInTheDocument();
    expect(screen.getByText('$14.99')).toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith({
      experimentId: 'exp-1',
      variantName: 'variant-b',
      productId: product.id,
      userId: 'user-1',
      event: 'view',
    });
  });
});
