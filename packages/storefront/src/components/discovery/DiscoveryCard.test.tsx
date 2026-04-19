/**
 * Purpose: Verify the discovery card renders recommendation details and adds
 * products to the shared cart state.
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

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetCartState, useCartState } from '../../state/cart-state';
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
  beforeEach(() => {
    resetCartState();
  });

  it('renders product information and the recommendation reason', () => {
    renderDiscoveryCard(makeDiscoveryItem());

    expect(screen.getByText('Shader Lab')).toBeInTheDocument();
    expect(screen.getByText('Pixel Forge')).toBeInTheDocument();
    expect(screen.getByText('$24.99')).toBeInTheDocument();
    expect(
      screen.getByText('Because you bought Ambient Toolkit'),
    ).toBeInTheDocument();
  });

  it('adds the product to the cart when the quick action is pressed', async () => {
    const user = userEvent.setup();

    renderDiscoveryCard(makeDiscoveryItem());

    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(useCartState.getState().items).toEqual([
      expect.objectContaining({
        productId: 'product-1',
        variantId: 'variant-1',
        name: 'Shader Lab',
        price: 2499,
        quantity: 1,
      }),
    ]);
  });
});
