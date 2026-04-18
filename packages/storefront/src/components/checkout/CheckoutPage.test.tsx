/**
 * Purpose: Tests for the checkout page orchestrator.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/service-architecture.md (Storefront -> Stripe flow)
 * External references:
 *   - https://react.dev/reference/react/useState
 * Tests:
 *   - packages/storefront/src/components/checkout/CheckoutPage.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutPage } from './CheckoutPage';
import { resetCartState, useCartState } from '../../state/cart-state';

vi.mock('./PaymentForm', () => ({
  PaymentForm: ({
    error,
    onBack,
    onPaymentSuccess,
  }: {
    error?: string;
    onBack: () => void;
    onPaymentSuccess: (paymentIntentId: string) => void | Promise<void>;
  }) => (
    <div>
      <div data-testid="mock-payment-form">Payment step</div>
      {error ? <div role="alert">{error}</div> : null}
      <button type="button" onClick={onBack}>
        Back to cart
      </button>
      <button
        type="button"
        onClick={() => {
          void onPaymentSuccess('pi_test_123');
        }}
      >
        Complete payment
      </button>
    </div>
  ),
}));

describe('CheckoutPage', () => {
  function renderCheckoutPage(createOrderSummary = vi.fn()) {
    return render(
      <MemoryRouter>
        <CheckoutPage createOrderSummary={createOrderSummary} />
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    resetCartState();
  });

  it('renders the cart review step first', () => {
    renderCheckoutPage();

    expect(screen.getByRole('heading', { name: /review your cart/i })).toBeInTheDocument();
  });

  it('moves to payment after proceeding', async () => {
    const user = userEvent.setup();

    useCartState.getState().addItem({
      lineId: 'line-1',
      productId: 'product-1',
      variantId: 'variant-1',
      name: 'Creator Toolkit',
      basePrice: 2500,
      price: 2500,
      quantity: 1,
      heroImageUrl: 'https://cdn.example.com/toolkit.webp',
      currencyCode: 'USD',
      slug: 'creator-toolkit',
    });

    renderCheckoutPage();

    await user.click(screen.getByRole('button', { name: /proceed to payment/i }));

    expect(screen.getByTestId('mock-payment-form')).toBeInTheDocument();
  });

  it('shows confirmation after a successful payment', async () => {
    const user = userEvent.setup();
    const createOrderSummary = vi.fn().mockResolvedValue({
      orderId: 'order_123',
      items: [
        {
          productId: 'product-1',
          variantId: 'variant-1',
          name: 'Creator Toolkit',
          price: 2500,
          quantity: 1,
          imageUrl: 'https://cdn.example.com/toolkit.webp',
        },
      ],
      subtotal: 2500,
      platformFee: 125,
      total: 2625,
      currency: 'USD',
      createdAt: '2026-01-01T10:00:00.000Z',
    });

    useCartState.getState().addItem({
      lineId: 'line-1',
      productId: 'product-1',
      variantId: 'variant-1',
      name: 'Creator Toolkit',
      basePrice: 2500,
      price: 2500,
      quantity: 1,
      heroImageUrl: 'https://cdn.example.com/toolkit.webp',
      currencyCode: 'USD',
      slug: 'creator-toolkit',
    });

    renderCheckoutPage(createOrderSummary);

    await user.click(screen.getByRole('button', { name: /proceed to payment/i }));
    await user.click(screen.getByRole('button', { name: /complete payment/i }));

    await waitFor(() => {
      expect(screen.getByText(/thanks for your purchase/i)).toBeInTheDocument();
    });
  });

  it('shows payment errors from order creation failures', async () => {
    const user = userEvent.setup();
    const createOrderSummary = vi.fn().mockRejectedValue(new Error('Unable to finalize order.'));

    useCartState.getState().addItem({
      lineId: 'line-1',
      productId: 'product-1',
      variantId: 'variant-1',
      name: 'Creator Toolkit',
      basePrice: 2500,
      price: 2500,
      quantity: 1,
      heroImageUrl: 'https://cdn.example.com/toolkit.webp',
      currencyCode: 'USD',
      slug: 'creator-toolkit',
    });

    renderCheckoutPage(createOrderSummary);

    await user.click(screen.getByRole('button', { name: /proceed to payment/i }));
    await user.click(screen.getByRole('button', { name: /complete payment/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to finalize order/i);
  });

  it('does not allow moving to payment while prerequisites are missing', async () => {
    const user = userEvent.setup();

    useCartState.getState().addItem({
      lineId: 'line-addon',
      productId: 'product-addon',
      variantId: 'variant-addon',
      name: 'Pro Add-on',
      basePrice: 3000,
      price: 3000,
      quantity: 1,
      heroImageUrl: null,
      currencyCode: 'USD',
      slug: 'pro-addon',
      dependencyRequirements: [
        {
          requiredProductId: 'product-base',
          requiredVariantId: 'variant-base',
          requiredProductName: 'Base Package',
          requiredProductSlug: 'base-package',
          requiredProductPrice: 1500,
          currencyCode: 'USD',
          requiredProductHeroImageUrl: null,
        },
      ],
    });

    renderCheckoutPage();

    await user.click(screen.getByRole('button', { name: /proceed to payment/i }));

    expect(screen.queryByTestId('mock-payment-form')).not.toBeInTheDocument();
    expect(screen.getByText(/checkout is blocked/i)).toBeInTheDocument();
  });
});
