/**
 * Purpose: Public API for the checkout plugin.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 * Tests:
 *   - packages/vendure-server/src/plugins/checkout/checkout.service.test.ts
 */

export { CheckoutPlugin } from './checkout.plugin.js';
export {
  calculateCheckoutTotals,
  validateCheckoutCart,
  buildCheckoutPaymentParams,
  buildOrderMetadata,
  CheckoutError,
} from './checkout.service.js';
export type { CheckoutCartItem, CheckoutTotals, CheckoutValidation } from './checkout.service.js';
