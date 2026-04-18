/**
 * Purpose: Shared checkout types for cart review, payment, and confirmation.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/domain-model.md (Order, OrderLine)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#order
 * Tests:
 *   - packages/storefront/src/components/checkout/use-checkout.test.ts
 */
export type CheckoutStep = 'review' | 'payment' | 'confirmation';

export interface CheckoutState {
  readonly step: CheckoutStep;
  readonly orderId?: string;
  readonly error?: string;
  readonly isProcessing: boolean;
}

export interface CartLineItem {
  readonly productId: string;
  readonly variantId: string;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
  readonly imageUrl?: string;
}

export interface OrderSummary {
  readonly orderId: string;
  readonly items: readonly CartLineItem[];
  readonly subtotal: number;
  readonly platformFee: number;
  readonly total: number;
  readonly currency: string;
  readonly createdAt: string;
}
