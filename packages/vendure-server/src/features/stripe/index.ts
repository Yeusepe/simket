/**
 * Purpose: Stripe Connect feature barrel — re-exports service and types.
 *
 * Governing docs:
 *   - docs/architecture.md (§7 Payments)
 *   - docs/service-architecture.md (Stripe integration)
 * Tests:
 *   - packages/vendure-server/src/features/stripe/stripe.service.test.ts
 */
export { StripeService } from './stripe.service.js';
export type {
  StripeConnectConfig,
  CreatePaymentIntentParams,
  CollaborationSplit,
  SplitResult,
  PaymentResult,
  AccountLinkResult,
} from './stripe.types.js';
