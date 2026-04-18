/**
 * Purpose: Public exports for checkout components and hooks.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 * External references:
 *   - https://react.dev/learn/reusing-logic-with-custom-hooks
 * Tests:
 *   - packages/storefront/src/components/checkout/CheckoutPage.test.tsx
 */
export { CheckoutPage } from './CheckoutPage';
export { CartReview } from './CartReview';
export { PaymentForm } from './PaymentForm';
export { OrderConfirmation } from './OrderConfirmation';
export { useCheckout } from './use-checkout';
export type {
  CheckoutStep,
  CheckoutState,
  CartLineItem,
  OrderSummary,
} from './checkout-types';
