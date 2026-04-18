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
      lineId: 'line-1',
      productId: 'product-1',
      variantId: 'variant-1',
      name: 'Creator Toolkit',
      basePrice: 2500,
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

    render(<CartReview onProceed={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /remove creator toolkit/i }));

    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it('proceeds to payment when requested', async () => {
    const user = userEvent.setup();
    const onProceed = vi.fn();

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

    render(<CartReview onProceed={onProceed} />);

    await user.click(screen.getByRole('button', { name: /proceed to payment/i }));

    expect(onProceed).toHaveBeenCalledOnce();
  });

  it('renders bundle grouping with a bundle label and savings breakdown', () => {
    useCartState.getState().replaceItems([
      {
        lineId: 'bundle-line-1',
        productId: 'product-1',
        variantId: 'variant-1',
        name: 'Base Package',
        basePrice: 2000,
        price: 1600,
        quantity: 1,
        heroImageUrl: null,
        currencyCode: 'USD',
        slug: 'base-package',
        bundle: {
          bundleId: 'complete-pack',
          instanceId: 'bundle-instance-1',
          name: 'Complete Pack',
          discountPercent: 20,
        },
      },
      {
        lineId: 'bundle-line-2',
        productId: 'product-2',
        variantId: 'variant-2',
        name: 'Add-on Pack',
        basePrice: 3000,
        price: 2400,
        quantity: 1,
        heroImageUrl: null,
        currencyCode: 'USD',
        slug: 'add-on-pack',
        bundle: {
          bundleId: 'complete-pack',
          instanceId: 'bundle-instance-1',
          name: 'Complete Pack',
          discountPercent: 20,
        },
      },
    ]);

    render(<CartReview onProceed={vi.fn()} />);

    expect(screen.getByText('Bundle')).toBeInTheDocument();
    expect(screen.getByText('Complete Pack')).toBeInTheDocument();
    expect(screen.getByText(/bundle savings/i)).toBeInTheDocument();
    expect(screen.getAllByText('-$10.00')).toHaveLength(2);
  });

  it('blocks checkout for missing prerequisites and lets the shopper add them', async () => {
    const user = userEvent.setup();
    const onProceed = vi.fn();

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
          discountPercent: 25,
          message: 'Requires Base Package first.',
        },
      ],
    });

    render(<CartReview onProceed={onProceed} />);

    expect(screen.getByText(/checkout is blocked/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /proceed to payment/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /add prerequisite/i }));

    expect(screen.getByRole('button', { name: /proceed to payment/i })).toBeEnabled();
    expect(screen.getByText(/dependency -25%/i)).toBeInTheDocument();
  });
});
