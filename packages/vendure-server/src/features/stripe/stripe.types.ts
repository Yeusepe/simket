/**
 * Purpose: Stripe Connect type definitions — config, request/response shapes
 *          for marketplace payments, destination charges, and collaboration splits.
 *
 * Governing docs:
 *   - docs/architecture.md (§7 Payments)
 *   - docs/service-architecture.md (Stripe integration)
 * External references:
 *   - https://stripe.com/docs/connect/destination-charges
 *   - https://stripe.com/docs/api/payment_intents/create
 *   - https://stripe.com/docs/connect/account-types (Express accounts)
 * Tests:
 *   - packages/vendure-server/src/features/stripe/stripe.service.test.ts
 */

// ---------- Configuration ----------

/** Stripe Connect configuration for the platform. */
export interface StripeConnectConfig {
  /** Webhook signing secret (whsec_…) for verifying inbound webhook payloads. */
  webhookSecret: string;
  /** The platform's own Stripe account ID (acct_…). */
  platformAccountId: string;
}

// ---------- PaymentIntent creation ----------

/** Parameters for creating a Stripe PaymentIntent with optional destination charge. */
export interface CreatePaymentIntentParams {
  /** Amount in smallest currency unit (e.g. cents). Must be a positive integer. */
  amount: number;
  /** ISO 4217 currency code in lowercase (e.g. "usd", "eur"). */
  currencyCode: string;
  /** Stripe Customer ID (cus_…). Optional for guest checkout. */
  customerId?: string;
  /** Connected account ID (acct_…) for destination charge. Omit for platform-only charges. */
  connectedAccountId?: string;
  /** Platform fee in smallest currency unit. Required when connectedAccountId is set. */
  applicationFeeAmount?: number;
  /** Idempotency key to prevent duplicate charges. Use generateIdempotencyKey(). */
  idempotencyKey: string;
  /** Arbitrary key-value metadata attached to the PaymentIntent. */
  metadata?: Record<string, string>;
}

// ---------- Collaboration splits ----------

/** A creator's share of a collaboration sale. */
export interface CollaborationSplit {
  /** Internal creator ID from the domain model. */
  creatorId: string;
  /** The creator's connected Stripe account ID (acct_…). */
  stripeAccountId: string;
  /** Percentage share of the distributable amount (after platform fee). Must sum to 100 across all splits. */
  sharePercent: number;
}

/** Result of a split calculation — one entry per creator. */
export interface SplitResult {
  creatorId: string;
  stripeAccountId: string;
  /** Amount in smallest currency unit to be transferred to this creator. */
  amount: number;
}

// ---------- PaymentIntent result ----------

/** Normalised result after creating a Stripe PaymentIntent. */
export interface PaymentResult {
  /** The Stripe PaymentIntent ID (pi_…). */
  paymentIntentId: string;
  /** Current status of the PaymentIntent. */
  status: string;
  /** Client secret for frontend confirmation via Stripe.js. */
  clientSecret: string;
}

// ---------- Account link result ----------

/** Result from creating a Connect Express account + onboarding link. */
export interface AccountLinkResult {
  /** The newly created connected account ID (acct_…). */
  accountId: string;
  /** Stripe-hosted onboarding URL for the creator. */
  url: string;
}
