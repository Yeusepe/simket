/**
 * Purpose: Tests for the checkout cart review step.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/domain-model.md (OrderLine pricing in minor units)
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/avatar
 * Tests:
 *   - packages/storefront/src/components/checkout/CartReview.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartReview } from './CartReview';
import { resetCartState, useCartState } from '../../state/cart-state';

describe('CartReview', () => {
  beforeEach(() => {
    resetCartState();
  });

  it('renders an empty state when the cart has no items', () => {
    render(<CartReview onProceed={vi.fn()} />);

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /proceed to payment/i }),
    ).toBeDisabled();
  });

  it('renders cart items and transparent pricing breakdown', () => {
    useCartState.getState().addItem({
      productId: 'product-1',
      variantId: 'variant-1',
      name: 'Creator Toolkit',
      price: 2500,
      quantity: 2,
      heroImageUrl: 'https://cdn.example.com/toolkit.webp',
      currencyCode: 'USD',
      slug: 'creator-toolkit',
    });

    render(<CartReview onProceed={vi.fn()} platformFeeRate={0.1} />);

    expect(screen.getByText('Creator Toolkit')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('$55.00')).toBeInTheDocument();
  });

  it('removes an item from the shared cart state', async () => {
    const user = userEvent.setup();

    useCartState.getState().addItem({
      productId: 'product-1',
      variantId: 'variant-1',
      name: 'Creator Toolkit',
      price: 2500,
      quantity: 1,
      heroImageUrl: 'https://cdn.example.com/toolkit.webp',
      currencyCode: 'USD',
      slug: 'creator-toolkit',
    });

    render(<CartReview onProceed={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /remove creator toolkit/i }));

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it('proceeds to payment when requested', async () => {
    const user = userEvent.setup();
    const onProceed = vi.fn();

    useCartState.getState().addItem({
      productId: 'product-1',
      variantId: 'variant-1',
      name: 'Creator Toolkit',
      price: 2500,
      quantity: 1,
      heroImageUrl: 'https://cdn.example.com/toolkit.webp',
      currencyCode: 'USD',
      slug: 'creator-toolkit',
    });

    render(<CartReview onProceed={onProceed} />);

    await user.click(screen.getByRole('button', { name: /proceed to payment/i }));

    expect(onProceed).toHaveBeenCalledOnce();
  });
});
