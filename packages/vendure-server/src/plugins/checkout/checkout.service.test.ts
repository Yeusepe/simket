/**
 * Purpose: Tests for CheckoutService — payment intent creation and order finalization logic.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 *   - docs/service-architecture.md §1.13 (Hyperswitch API contract)
 * External references:
 *   - https://api-reference.hyperswitch.io/#tag/Payments
 *   - https://docs.vendure.io/guides/developer-guide/payment-integrations/
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  buildCheckoutPaymentParams,
  buildOrderMetadata,
  calculateCheckoutTotals,
  validateCheckoutCart,
  CheckoutError,
} from './checkout.service.js';
import type { CheckoutCartItem } from './checkout.service.js';

describe('CheckoutService', () => {
  const sampleItems: CheckoutCartItem[] = [
    { productId: 'prod-1', title: 'Avatar A', priceCents: 1500, quantity: 1, takeRate: 5 },
    { productId: 'prod-2', title: 'Texture Pack', priceCents: 800, quantity: 2, takeRate: 10 },
  ];

  describe('calculateCheckoutTotals', () => {
    it('calculates subtotal from item prices × quantities', () => {
      const totals = calculateCheckoutTotals(sampleItems);
      // 1500*1 + 800*2 = 3100
      expect(totals.subtotalCents).toBe(3100);
    });

    it('applies regional discount to subtotal', () => {
      const totals = calculateCheckoutTotals(sampleItems, 40);
      // 3100 * (1 - 0.40) = 1860
      expect(totals.discountedSubtotalCents).toBe(1860);
    });

    it('applies zero discount by default', () => {
      const totals = calculateCheckoutTotals(sampleItems);
      expect(totals.discountedSubtotalCents).toBe(3100);
    });

    it('calculates platform fee per item', () => {
      const totals = calculateCheckoutTotals(sampleItems);
      // Item 1: ceil(1500 * 0.05) = 75
      // Item 2: ceil(800 * 0.10) * 2 = 80 * 2 = 160
      expect(totals.platformFeeCents).toBe(235);
    });

    it('returns total equal to discounted subtotal', () => {
      const totals = calculateCheckoutTotals(sampleItems, 20);
      // 3100 * 0.80 = 2480
      expect(totals.totalCents).toBe(2480);
    });

    it('prefers per-item regional discounts when provided', () => {
      const totals = calculateCheckoutTotals([
        { productId: 'prod-1', title: 'Avatar A', priceCents: 1000, quantity: 1, takeRate: 5, regionalDiscountPercent: 50, currencyCode: 'USD' },
        { productId: 'prod-2', title: 'Texture Pack', priceCents: 1000, quantity: 1, takeRate: 5, regionalDiscountPercent: 25, currencyCode: 'USD' },
      ]);

      expect(totals.discountedSubtotalCents).toBe(1250);
      expect(totals.totalCents).toBe(1250);
    });

    it('handles empty cart', () => {
      const totals = calculateCheckoutTotals([]);
      expect(totals.subtotalCents).toBe(0);
      expect(totals.totalCents).toBe(0);
      expect(totals.platformFeeCents).toBe(0);
    });
  });

  describe('validateCheckoutCart', () => {
    it('accepts valid cart', () => {
      const result = validateCheckoutCart(sampleItems);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects empty cart', () => {
      const result = validateCheckoutCart([]);
      expect(result.valid).toBe(false);
    });

    it('rejects item with zero price', () => {
      const result = validateCheckoutCart([
        { productId: 'p1', title: 'Free', priceCents: 0, quantity: 1, takeRate: 5 },
      ]);
      expect(result.valid).toBe(false);
    });

    it('rejects item with negative quantity', () => {
      const result = validateCheckoutCart([
        { productId: 'p1', title: 'A', priceCents: 100, quantity: -1, takeRate: 5 },
      ]);
      expect(result.valid).toBe(false);
    });

    it('rejects item with take rate below 5%', () => {
      const result = validateCheckoutCart([
        { productId: 'p1', title: 'A', priceCents: 100, quantity: 1, takeRate: 3 },
      ]);
      expect(result.valid).toBe(false);
    });
  });

  describe('buildCheckoutPaymentParams', () => {
    it('builds Hyperswitch-compatible payment params', () => {
      const params = buildCheckoutPaymentParams({
        items: sampleItems,
        customerId: 'cust-123',
        currency: 'USD',
        returnUrl: 'https://simket.com/checkout/return',
        orderId: 'order-456',
      });

      expect(params.amount).toBe(3100); // no discount
      expect(params.currency).toBe('USD');
      expect(params.customerId).toBe('cust-123');
      expect(params.captureMethod).toBe('automatic');
      expect(params.merchantOrderReferenceId).toBe('order-456');
      expect(params.orderDetails).toHaveLength(2);
      expect(params.orderDetails![0].productName).toBe('Avatar A');
    });

    it('applies regional discount to payment amount', () => {
      const params = buildCheckoutPaymentParams({
        items: sampleItems,
        customerId: 'cust-123',
        currency: 'USD',
        returnUrl: 'https://simket.com/checkout/return',
        orderId: 'order-456',
        regionalDiscountPercent: 50,
      });

      // 3100 * 0.50 = 1550
      expect(params.amount).toBe(1550);
    });

    it('uses item-level regional discounts in order details and totals', () => {
      const params = buildCheckoutPaymentParams({
        items: [
          { productId: 'prod-1', title: 'Avatar A', priceCents: 1000, quantity: 1, takeRate: 5, regionalDiscountPercent: 50, currencyCode: 'USD' },
          { productId: 'prod-2', title: 'Texture Pack', priceCents: 1000, quantity: 1, takeRate: 10, regionalDiscountPercent: 25, currencyCode: 'USD' },
        ],
        customerId: 'cust-123',
        currency: 'USD',
        returnUrl: 'https://simket.com/checkout/return',
        orderId: 'order-456',
      });

      expect(params.amount).toBe(1250);
      expect(params.orderDetails).toEqual([
        expect.objectContaining({ amount: 500 }),
        expect.objectContaining({ amount: 750 }),
      ]);
    });

    it('includes metadata with orderId', () => {
      const params = buildCheckoutPaymentParams({
        items: sampleItems,
        customerId: 'cust-123',
        currency: 'USD',
        returnUrl: 'https://simket.com/return',
        orderId: 'order-789',
      });

      expect(params.metadata).toEqual(
        expect.objectContaining({ orderId: 'order-789' }),
      );
    });
  });

  describe('buildOrderMetadata', () => {
    it('creates order metadata with item IDs', () => {
      const metadata = buildOrderMetadata('order-1', sampleItems, 'cust-1');
      expect(metadata.orderId).toBe('order-1');
      expect(metadata.customerId).toBe('cust-1');
      expect(metadata.productIds).toBe('prod-1,prod-2');
      expect(metadata.itemCount).toBe('2');
    });
  });

  describe('CheckoutError', () => {
    it('creates error with code and message', () => {
      const err = new CheckoutError('CART_EMPTY', 'Cart is empty');
      expect(err.code).toBe('CART_EMPTY');
      expect(err.message).toBe('Cart is empty');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
