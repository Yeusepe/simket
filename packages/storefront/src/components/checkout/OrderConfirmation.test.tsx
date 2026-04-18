/**
 * Purpose: Tests for the order confirmation step.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/domain-model.md (Order, OrderLine)
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/checkout/OrderConfirmation.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OrderConfirmation } from './OrderConfirmation';
import type { OrderSummary } from './checkout-types';

const summary: OrderSummary = {
  orderId: 'order_123',
  items: [
    {
      productId: 'product-1',
      variantId: 'variant-1',
      name: 'Creator Toolkit',
      price: 2500,
      quantity: 2,
      imageUrl: 'https://cdn.example.com/toolkit.webp',
    },
  ],
  subtotal: 5000,
  platformFee: 500,
  total: 5500,
  currency: 'USD',
  createdAt: '2026-01-01T10:00:00.000Z',
};

describe('OrderConfirmation', () => {
  it('renders the order identifier and purchased items', () => {
    render(
      <OrderConfirmation
        orderSummary={summary}
        onContinueShopping={vi.fn()}
        onGoToLibrary={vi.fn()}
      />,
    );

    expect(screen.getByText(/order_123/i)).toBeInTheDocument();
    expect(screen.getByText('Creator Toolkit')).toBeInTheDocument();
    expect(screen.getByText('$55.00')).toBeInTheDocument();
  });

  it('supports continuing shopping', async () => {
    const user = userEvent.setup();
    const onContinueShopping = vi.fn();

    render(
      <OrderConfirmation
        orderSummary={summary}
        onContinueShopping={onContinueShopping}
        onGoToLibrary={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /continue shopping/i }));

    expect(onContinueShopping).toHaveBeenCalledOnce();
  });

  it('supports opening the library', async () => {
    const user = userEvent.setup();
    const onGoToLibrary = vi.fn();

    render(
      <OrderConfirmation
        orderSummary={summary}
        onContinueShopping={vi.fn()}
        onGoToLibrary={onGoToLibrary}
      />,
    );

    await user.click(screen.getByRole('button', { name: /go to library/i }));

    expect(onGoToLibrary).toHaveBeenCalledOnce();
  });
});
