/**
 * Tests:
 *   - packages/storefront/src/components/today/TrendingProductCard.test.tsx
 */
import { render, screen } from '@testing-library/react';
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
  it('renders bento-radius tile, md tags, byline, rating, and price', () => {
    resetProductCounter();
    const product = makeProductListItem({
      name: 'Ethereal Avatar Base',
      heroImageUrl: 'https://cdn.example.com/h.webp',
      collaborators: [{ name: 'Alex Kim' }],
      averageRating: 4.6,
      reviewCount: 42,
    });
    renderCard(product);

    expect(screen.getByTestId('trending-product-card')).toBeInTheDocument();
    expect(screen.getByTestId('trending-product-tags')).toBeInTheDocument();
    expect(screen.getByTestId('product-creators-byline')).toBeInTheDocument();
    expect(screen.getByTestId('trending-product-rating')).toBeInTheDocument();
    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
  });
});
