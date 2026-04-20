/**
 * Purpose: Verify the discovery card uses the same visual component contract as trending.
 *
 * Governing docs:
 *   - docs/architecture.md (§6 storefront, §7 HeroUI everywhere)
 *   - docs/domain-model.md (§4.1 Product)
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 *   - https://www.heroui.com/docs/react/components/chip
 * Tests:
 *   - packages/storefront/src/components/discovery/DiscoveryCard.test.tsx
 */

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DiscoveryCard } from './DiscoveryCard';
import type { DiscoveryFeedItem } from './discovery-types';

function renderDiscoveryCard(item: DiscoveryFeedItem) {
  return render(
    <MemoryRouter>
      <DiscoveryCard item={item} />
    </MemoryRouter>,
  );
}

function makeDiscoveryItem(
  overrides: Partial<DiscoveryFeedItem> = {},
): DiscoveryFeedItem {
  return {
    productId: 'product-1',
    slug: 'product-1',
    name: 'Shader Lab',
    imageUrl: 'https://cdn.example.com/products/shader-lab.webp',
    price: 2499,
    currencyCode: 'USD',
    creatorName: 'Pixel Forge',
    reason: 'Because you bought Ambient Toolkit',
    score: 0.92,
    source: 'purchase-history',
    variantId: 'variant-1',
    ...overrides,
  };
}

describe('DiscoveryCard', () => {
  it('renders product information through the unified tile contract', () => {
    renderDiscoveryCard(makeDiscoveryItem());

    expect(screen.getByText('Shader Lab')).toBeInTheDocument();
    expect(screen.getByText('Pixel Forge')).toBeInTheDocument();
    expect(screen.getByText('$24.99')).toBeInTheDocument();
    expect(screen.getByTestId('trending-product-tags')).toBeInTheDocument();
    expect(screen.getByTestId('product-creators-byline')).toBeInTheDocument();
    expect(within(screen.getByTestId('trending-product-price')).getByRole('button')).toBeInTheDocument();
  });
});
