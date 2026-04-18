/**
 * Purpose: Barrel exports for Hyperswitch payment integration.
 * Governing docs:
 *   - docs/architecture.md (§4 System boundary, §5 Service ownership)
 *   - docs/service-architecture.md (§1.13 Hyperswitch)
 * External references:
 *   - https://docs.hyperswitch.io/learn-more/sdk-reference/node
 * Tests:
 *   - packages/vendure-server/src/features/hyperswitch/hyperswitch.service.test.ts
 */
export { HyperswitchService } from './hyperswitch.service.js';
export { StripeService } from '../stripe/stripe.service.js';
export type {
  CaptureHyperswitchPaymentParams,
  ConfirmHyperswitchPaymentParams,
  CreateHyperswitchPaymentParams,
  HyperswitchOrderDetail,
  HyperswitchPayment,
  HyperswitchRefund,
  HyperswitchServiceConfig,
  HyperswitchSplitPayments,
  HyperswitchSplitRefunds,
  RefundHyperswitchPaymentParams,
} from './hyperswitch.types.js';
