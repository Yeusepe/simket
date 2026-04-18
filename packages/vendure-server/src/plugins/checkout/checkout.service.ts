/**
 * Purpose: Checkout logic — ties cart items to Hyperswitch payment creation.
 *
 * Pure functions for: cart validation, total calculation (with regional discounts),
 * platform fee computation, and building Hyperswitch-compatible payment params.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 *   - docs/service-architecture.md §1.13 (Hyperswitch API contract)
 * External references:
 *   - https://api-reference.hyperswitch.io/#tag/Payments
 *   - https://docs.vendure.io/guides/developer-guide/payment-integrations/
 * Tests:
 *   - packages/vendure-server/src/plugins/checkout/checkout.service.test.ts
 */

import { calculatePlatformFee } from '../platform-fee/platform-fee.service.js';
import { applyRegionalDiscount } from '../purchase-parity/purchase-parity.service.js';
import type { CreateHyperswitchPaymentParams, HyperswitchOrderDetail } from '../../features/hyperswitch/hyperswitch.types.js';

const MIN_TAKE_RATE = 5;

/** A cart item at checkout time — prices always read fresh from SQL, never cache. */
export interface CheckoutCartItem {
  readonly productId: string;
  readonly title: string;
  /** Price in cents — always from Vendure SQL, never cached. */
  readonly priceCents: number;
  readonly quantity: number;
  /** Platform take rate percentage (min 5%). */
  readonly takeRate: number;
}

export interface CheckoutTotals {
  readonly subtotalCents: number;
  readonly discountedSubtotalCents: number;
  readonly platformFeeCents: number;
  readonly totalCents: number;
}

export interface CheckoutValidation {
  readonly valid: boolean;
  readonly errors: string[];
}

/** Typed checkout error with an error code for programmatic handling. */
export class CheckoutError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

/**
 * Calculate checkout totals from cart items.
 *
 * @param items - Cart items with fresh SQL prices
 * @param regionalDiscountPercent - Optional regional discount (0-80)
 */
export function calculateCheckoutTotals(
  items: readonly CheckoutCartItem[],
  regionalDiscountPercent = 0,
): CheckoutTotals {
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );

  const discountedSubtotalCents =
    regionalDiscountPercent > 0
      ? applyRegionalDiscount(subtotalCents, regionalDiscountPercent)
      : subtotalCents;

  const platformFeeCents = items.reduce((sum, item) => {
    const itemFee = calculatePlatformFee(item.priceCents, item.takeRate);
    return sum + itemFee * item.quantity;
  }, 0);

  return {
    subtotalCents,
    discountedSubtotalCents,
    platformFeeCents,
    totalCents: discountedSubtotalCents,
  };
}

/**
 * Validate a checkout cart before proceeding to payment.
 * All prices must be > 0 (free products don't go through checkout).
 */
export function validateCheckoutCart(
  items: readonly CheckoutCartItem[],
): CheckoutValidation {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push('Cart is empty');
    return { valid: false, errors };
  }

  for (const item of items) {
    if (item.priceCents <= 0) {
      errors.push(`Product "${item.title}" has invalid price: ${item.priceCents}`);
    }
    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      errors.push(`Product "${item.title}" has invalid quantity: ${item.quantity}`);
    }
    if (item.takeRate < MIN_TAKE_RATE) {
      errors.push(
        `Product "${item.title}" has take rate below minimum (${item.takeRate}% < ${MIN_TAKE_RATE}%)`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build Hyperswitch payment creation params from checkout data.
 */
export function buildCheckoutPaymentParams(opts: {
  items: readonly CheckoutCartItem[];
  customerId: string;
  currency: string;
  returnUrl: string;
  orderId: string;
  regionalDiscountPercent?: number;
}): CreateHyperswitchPaymentParams {
  const totals = calculateCheckoutTotals(opts.items, opts.regionalDiscountPercent);

  const orderDetails: HyperswitchOrderDetail[] = opts.items.map((item) => ({
    productName: item.title,
    quantity: item.quantity,
    amount: item.priceCents * item.quantity,
    productId: item.productId,
  }));

  return {
    amount: totals.totalCents,
    currency: opts.currency,
    customerId: opts.customerId,
    captureMethod: 'automatic',
    returnUrl: opts.returnUrl,
    merchantOrderReferenceId: opts.orderId,
    orderDetails,
    metadata: buildOrderMetadata(opts.orderId, opts.items, opts.customerId),
    confirm: false,
  };
}

/**
 * Build order metadata for Hyperswitch payment tracking.
 */
export function buildOrderMetadata(
  orderId: string,
  items: readonly CheckoutCartItem[],
  customerId: string,
): Record<string, string> {
  return {
    orderId,
    customerId,
    productIds: items.map((i) => i.productId).join(','),
    itemCount: String(items.length),
  };
}
