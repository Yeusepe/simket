/**
 * Purpose: Public API for the checkout plugin.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 * Tests:
 *   - packages/vendure-server/src/plugins/checkout/checkout.service.test.ts
 */

export { CheckoutPlugin } from './checkout.plugin.js';
export { checkoutShopApiExtensions, CheckoutResolver } from './checkout.api.js';
export {
  CheckoutService,
  calculateCheckoutTotals,
  validateCheckoutCart,
  buildCheckoutPaymentParams,
  buildOrderMetadata,
  CheckoutError,
} from './checkout.service.js';
export type {
  CheckoutCartItem,
  CheckoutTotals,
  CheckoutValidation,
  CheckoutValidationResult,
  CheckoutInitiationResult,
  CheckoutStatusResult,
  RequestedCheckoutCartItem,
} from './checkout.service.js';
