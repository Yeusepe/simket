import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import { CheckoutResolver } from './checkout.api.js';

describe('CheckoutResolver', () => {
  const ctx = {} as RequestContext;

  function createResolver() {
    const checkoutService = {
      validateCart: vi.fn(),
      initiateCheckout: vi.fn(),
      getCheckoutStatus: vi.fn(),
    };

    return {
      checkoutService,
      resolver: new CheckoutResolver(checkoutService as never),
    };
  }

  it('delegates validateCart with normalized cart items', async () => {
    const { checkoutService, resolver } = createResolver();
    const expected = {
      valid: true,
      errors: [],
      items: [],
      totals: {
        subtotalCents: 0,
        discountedSubtotalCents: 0,
        platformFeeCents: 0,
        totalCents: 0,
      },
    };
    checkoutService.validateCart.mockResolvedValue(expected);

    const result = await resolver.validateCart(ctx, [{ productId: ' prod-1 ', quantity: 2 }]);

    expect(checkoutService.validateCart).toHaveBeenCalledWith(ctx, [
      { productId: 'prod-1', quantity: 2 },
    ]);
    expect(result).toEqual(expected);
  });

  it('rejects invalid cart item input before touching the service', async () => {
    const { checkoutService, resolver } = createResolver();

    await expect(
      resolver.validateCart(ctx, [{ productId: '   ', quantity: 0 }]),
    ).rejects.toThrow('Checkout cart items must include a productId and positive integer quantity.');

    expect(checkoutService.validateCart).not.toHaveBeenCalled();
  });

  it('delegates initiateCheckout with normalized args', async () => {
    const { checkoutService, resolver } = createResolver();
    const expected = {
      orderId: 'order-1',
      totals: {
        subtotalCents: 1000,
        discountedSubtotalCents: 1000,
        platformFeeCents: 50,
        totalCents: 1000,
      },
      payment: {
        amount: 1000,
        currency: 'USD',
        captureMethod: 'automatic',
        returnUrl: 'https://simket.test/return',
        confirm: false,
        merchantOrderReferenceId: 'order-1',
        customerId: 'customer-1',
        metadata: { orderId: 'order-1' },
        orderDetails: [],
      },
    };
    checkoutService.initiateCheckout.mockResolvedValue(expected);

    const result = await resolver.initiateCheckout(
      ctx,
      [{ productId: ' prod-1 ', quantity: 1 }],
      'https://simket.test/return',
      'order-1',
    );

    expect(checkoutService.initiateCheckout).toHaveBeenCalledWith(
      ctx,
      [{ productId: 'prod-1', quantity: 1 }],
      'https://simket.test/return',
      'order-1',
    );
    expect(result).toEqual(expected);
  });

  it('delegates checkoutStatus', async () => {
    const { checkoutService, resolver } = createResolver();
    const expected = {
      orderId: '100',
      code: 'T100',
      state: 'ArrangingPayment',
      active: true,
      totalWithTax: 1500,
      currencyCode: 'USD',
    };
    checkoutService.getCheckoutStatus.mockResolvedValue(expected);

    const result = await resolver.checkoutStatus(ctx, '100');

    expect(checkoutService.getCheckoutStatus).toHaveBeenCalledWith(ctx, '100');
    expect(result).toEqual(expected);
  });
});
