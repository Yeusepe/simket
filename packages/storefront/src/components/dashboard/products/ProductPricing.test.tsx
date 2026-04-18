/**
 * Purpose: Regression tests for creator pricing controls and fee breakdown messaging.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/slider
 *   - https://www.heroui.com/docs/react/components/input
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/ProductPricing.test.tsx
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductPricing } from './ProductPricing';

describe('ProductPricing', () => {
  it('formats the current price and earnings summary', () => {
    render(
      <ProductPricing
        data={{
          price: 2500,
          compareAtPrice: 4000,
          currency: 'USD',
          platformFeePercent: 15,
        }}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByDisplayValue('25.00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('40.00')).toBeInTheDocument();
    expect(screen.getByText('You earn $21.25 per sale')).toBeInTheDocument();
  });

  it('converts typed dollar values into cents', () => {
    const onChange = vi.fn();
    render(
      <ProductPricing
        data={{
          price: 2500,
          compareAtPrice: undefined,
          currency: 'USD',
          platformFeePercent: 5,
        }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '39.99' },
    });

    expect(onChange).toHaveBeenCalledWith({ price: 3999 });
  });

  it('updates the platform fee from the slider', () => {
    const onChange = vi.fn();
    render(
      <ProductPricing
        data={{
          price: 2500,
          compareAtPrice: undefined,
          currency: 'USD',
          platformFeePercent: 5,
        }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole('slider', { name: 'Platform fee percentage' }), {
      target: { value: '18' },
    });

    expect(onChange).toHaveBeenCalledWith({ platformFeePercent: 18 });
  });
});
