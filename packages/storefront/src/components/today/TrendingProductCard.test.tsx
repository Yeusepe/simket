/**
 * Tests:
 *   - packages/storefront/src/components/today/TrendingProductCard.test.tsx
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { makeProductListItem, resetProductCounter } from '../../types/product.factory';
import { TrendingProductCard } from './TrendingProductCard';

function renderCard(product: ReturnType<typeof makeProductListItem>) {
  return render(
    <MemoryRouter>
      <TrendingProductCard product={product} showWishlistButton={false} />
    </MemoryRouter>,
  );
}

describe('TrendingProductCard', () => {
  it('renders neutral tile, tags, byline, and price', () => {
    resetProductCounter();
    const product = makeProductListItem({
      name: 'Ethereal Avatar Base',
      heroImageUrl: 'https://cdn.example.com/h.webp',
      collaborators: [{ name: 'Alex Kim' }],
      previewColor: '#8b5cf6',
    });
    renderCard(product);

    expect(screen.getByTestId('trending-product-card')).toBeInTheDocument();
    expect(screen.getByTestId('trending-product-card')).toHaveAttribute('data-shell-color', '#8b5cf6');
    expect(screen.getByTestId('trending-product-card')).toHaveAttribute('data-surface-theme', 'leonardo');
    expect(screen.getByTestId('product-tile-media')).toHaveClass('w-full');
    expect(screen.getByTestId('trending-product-tags')).toBeInTheDocument();
    expect(screen.getByTestId('product-creators-byline')).toBeInTheDocument();
    expect(screen.getByTestId('product-creators-primary-avatar')).toBeInTheDocument();
    expect(screen.getByTestId('trending-product-price')).toBeInTheDocument();
    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
    expect(within(screen.getByTestId('trending-product-price')).getByRole('link')).toHaveAttribute(
      'href',
      '/product/product-1',
    );
  });
});
