/**
 * Purpose: Stripe Connect integration — marketplace payments, destination charges,
 *          collaboration splits, webhook verification, idempotency.
 *
 * Creates Express connected accounts for creators, processes destination charges
 * with application fees for the platform, and calculates collaboration splits
 * for multi-creator products.
 *
 * Governing docs:
 *   - docs/architecture.md (§7 Payments)
 *   - docs/service-architecture.md (Stripe integration)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://stripe.com/docs/connect/destination-charges
 *   - https://stripe.com/docs/api/payment_intents/create
 *   - https://stripe.com/docs/api/account_links/create
 *   - https://stripe.com/docs/webhooks/signatures
 *   - https://stripe.com/docs/connect/account-types (Express accounts)
 * Tests:
 *   - packages/vendure-server/src/features/stripe/stripe.service.test.ts
 */
import { trace, SpanStatusCode } from '@opentelemetry/api';
import type Stripe from 'stripe';
import { SERVICE_POLICIES } from '../../resilience/resilience.js';
import type {
  StripeConnectConfig,
  CreatePaymentIntentParams,
  CreateTransferParams,
  CollaborationSplit,
  SplitResult,
  PaymentResult,
  AccountLinkResult,
  TransferResult,
} from './stripe.types.js';

const tracer = trace.getTracer('simket-stripe');

export class StripeService {
  private readonly stripe: Stripe;
  private readonly config: StripeConnectConfig;

  constructor(stripe: Stripe, config: StripeConnectConfig) {
    this.stripe = stripe;
    this.config = config;
  }

  // ---------- createConnectAccountLink ----------

  /**
   * Creates a Stripe Express connected account for a creator and returns
   * a Stripe-hosted onboarding link.
   *
   * Docs: https://stripe.com/docs/api/accounts/create
   *       https://stripe.com/docs/api/account_links/create
   * Endpoint: POST /v1/accounts, POST /v1/account_links
   * Verified: response includes { id } for account and { url } for account link
   */
  async createConnectAccountLink(
    creatorId: string,
    returnUrl: string,
    refreshUrl: string,
  ): Promise<AccountLinkResult> {
    if (!creatorId || creatorId.trim().length === 0) {
      throw new Error('createConnectAccountLink: creatorId must not be empty');
    }
    if (!returnUrl || returnUrl.trim().length === 0) {
      throw new Error('createConnectAccountLink: returnUrl must not be empty');
    }
    if (!refreshUrl || refreshUrl.trim().length === 0) {
      throw new Error('createConnectAccountLink: refreshUrl must not be empty');
    }

    return tracer.startActiveSpan('stripe.createConnectAccountLink', async (span) => {
      try {
        span.setAttribute('stripe.creator_id', creatorId);

        const account = await SERVICE_POLICIES.hyperswitch.execute(() =>
          this.stripe.accounts.create({
            type: 'express',
            metadata: { creatorId },
          }),
        );

        span.setAttribute('stripe.account_id', account.id);

        const accountLink = await SERVICE_POLICIES.hyperswitch.execute(() =>
          this.stripe.accountLinks.create({
            account: account.id,
            type: 'account_onboarding',
            return_url: returnUrl,
            refresh_url: refreshUrl,
          }),
        );

        return {
          accountId: account.id,
          url: accountLink.url,
        };
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  // ---------- createPaymentIntent ----------

  /**
   * Creates a Stripe PaymentIntent with optional destination charge for
   * marketplace payments.
   *
   * Docs: https://stripe.com/docs/api/payment_intents/create
   *       https://stripe.com/docs/connect/destination-charges
   * Endpoint: POST /v1/payment_intents
   * Verified: response includes { id, status, client_secret }
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentResult> {
    if (!Number.isInteger(params.amount) || params.amount <= 0) {
      throw new Error(
        'createPaymentIntent: amount must be a positive integer (smallest currency unit)',
      );
    }
    if (!params.currencyCode || params.currencyCode.trim().length === 0) {
      throw new Error('createPaymentIntent: currencyCode must not be empty');
    }

    return tracer.startActiveSpan('stripe.createPaymentIntent', async (span) => {
      try {
        span.setAttribute('stripe.amount', params.amount);
        span.setAttribute('stripe.currency', params.currencyCode);
        if (params.connectedAccountId) {
          span.setAttribute('stripe.connected_account', params.connectedAccountId);
        }

        const createParams: Stripe.PaymentIntentCreateParams = {
          amount: params.amount,
          currency: params.currencyCode,
          automatic_payment_methods: { enabled: true },
          ...(params.customerId && { customer: params.customerId }),
          ...(params.connectedAccountId && {
            transfer_data: { destination: params.connectedAccountId },
            application_fee_amount: params.applicationFeeAmount,
          }),
          ...(params.transferGroup && { transfer_group: params.transferGroup }),
          ...(params.metadata && { metadata: params.metadata }),
        };

        const pi = await SERVICE_POLICIES.hyperswitch.execute(() =>
          this.stripe.paymentIntents.create(createParams, {
            idempotencyKey: params.idempotencyKey,
          }),
        );

        span.setAttribute('stripe.payment_intent_id', pi.id);
        span.setAttribute('stripe.status', pi.status);

        return {
          paymentIntentId: pi.id,
          status: pi.status,
          clientSecret: pi.client_secret ?? '',
        };
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  // ---------- calculateApplicationFee (static, pure) ----------

  /**
   * Calculates the platform application fee in minor currency units.
   * Uses Math.round for half-up rounding (no fractional cents).
   *
   * Docs: https://stripe.com/docs/connect/destination-charges#application-fees
   */
  static calculateApplicationFee(amount: number, takeRatePercent: number): number {
    if (amount < 0) {
      throw new Error('calculateApplicationFee: amount must not be negative');
    }
    if (takeRatePercent < 0 || takeRatePercent > 100) {
      throw new Error('calculateApplicationFee: takeRatePercent must be between 0 and 100');
    }

    return Math.round((amount * takeRatePercent) / 100);
  }

  // ---------- calculateCollaborationSplits (static, pure) ----------

  /**
   * Distributes the net amount (total minus platform fee) among creators
   * according to their share percentages. Uses floor + remainder allocation
   * to ensure integer amounts that sum exactly to the distributable total.
   *
   * Docs: https://stripe.com/docs/connect/destination-charges (transfer_data)
   */
  static calculateCollaborationSplits(
    totalAmount: number,
    platformFee: number,
    splits: CollaborationSplit[],
  ): SplitResult[] {
    if (!splits || splits.length === 0) {
      throw new Error('calculateCollaborationSplits: splits must not be empty');
    }
    if (platformFee > totalAmount) {
      throw new Error(
        'calculateCollaborationSplits: platformFee must not exceed totalAmount',
      );
    }

    const shareSum = splits.reduce((sum, s) => sum + s.sharePercent, 0);
    if (Math.abs(shareSum - 100) > 0.01) {
      throw new Error(
        `calculateCollaborationSplits: share percentages must sum to 100 (got ${shareSum})`,
      );
    }

    const distributable = totalAmount - platformFee;

    const results: SplitResult[] = splits.map((s) => ({
      creatorId: s.creatorId,
      stripeAccountId: s.stripeAccountId,
      amount: Math.floor((distributable * s.sharePercent) / 100),
    }));

    const allocated = results.reduce((sum, r) => sum + r.amount, 0);
    const remainder = distributable - allocated;

    // Allocate any leftover cents to the first creator
    if (remainder > 0 && results.length > 0) {
      results[0]!.amount += remainder;
    }

    return results;
  }

  // ---------- verifyWebhookSignature ----------

  /**
   * Creates a Stripe Connect transfer from the platform balance to a connected account.
   *
   * Docs: https://stripe.com/docs/connect/separate-charges-and-transfers
   *       https://docs.stripe.com/api/transfers/create
   * Endpoint: POST /v1/transfers
   * Verified: response includes { id, amount, currency, destination, transfer_group, source_transaction }
   */
  async createTransfer(params: CreateTransferParams): Promise<TransferResult> {
    if (!Number.isInteger(params.amount) || params.amount <= 0) {
      throw new Error('createTransfer: amount must be a positive integer (smallest currency unit)');
    }
    if (!params.currencyCode || params.currencyCode.trim().length === 0) {
      throw new Error('createTransfer: currencyCode must not be empty');
    }
    if (!params.destinationAccountId || params.destinationAccountId.trim().length === 0) {
      throw new Error('createTransfer: destinationAccountId must not be empty');
    }
    if (!params.transferGroup || params.transferGroup.trim().length === 0) {
      throw new Error('createTransfer: transferGroup must not be empty');
    }
    if (!params.idempotencyKey || params.idempotencyKey.trim().length === 0) {
      throw new Error('createTransfer: idempotencyKey must not be empty');
    }

    return tracer.startActiveSpan('stripe.createTransfer', async (span) => {
      try {
        span.setAttribute('stripe.amount', params.amount);
        span.setAttribute('stripe.currency', params.currencyCode);
        span.setAttribute('stripe.connected_account', params.destinationAccountId);
        span.setAttribute('stripe.transfer_group', params.transferGroup);

        const transfer = await SERVICE_POLICIES.hyperswitch.execute(() =>
          this.stripe.transfers.create(
            {
              amount: params.amount,
              currency: params.currencyCode,
              destination: params.destinationAccountId,
              transfer_group: params.transferGroup,
              ...(params.sourceTransactionId && {
                source_transaction: params.sourceTransactionId,
              }),
              ...(params.metadata && { metadata: params.metadata }),
            },
            {
              idempotencyKey: params.idempotencyKey,
            },
          ),
        );

        span.setAttribute('stripe.transfer_id', transfer.id);

        return {
          transferId: transfer.id,
          destinationAccountId:
            typeof transfer.destination === 'string'
              ? transfer.destination
              : transfer.destination?.id ?? params.destinationAccountId,
          amount: transfer.amount,
          currencyCode: transfer.currency,
          transferGroup: transfer.transfer_group ?? params.transferGroup,
          sourceTransactionId:
            typeof transfer.source_transaction === 'string'
              ? transfer.source_transaction
              : transfer.source_transaction?.id ?? null,
        };
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Verifies the Stripe webhook signature. Returns the parsed Event on success,
   * or null if signature verification fails.
   *
   * Docs: https://stripe.com/docs/webhooks/signatures
   * Uses: stripe.webhooks.constructEvent(payload, sig, secret)
   */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event | null {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret,
      );
    } catch {
      return null;
    }
  }

  // ---------- parsePaymentIntentEvent (static) ----------

  /**
   * Extracts the PaymentIntent object from a Stripe webhook event,
   * but only if the event type is a payment_intent.* event.
   *
   * Returns null for non-payment_intent event types.
   */
  static parsePaymentIntentEvent(
    event: Stripe.Event,
  ): Stripe.PaymentIntent | null {
    if (!event.type.startsWith('payment_intent.')) {
      return null;
    }
    return event.data.object as Stripe.PaymentIntent;
  }

  // ---------- generateIdempotencyKey (static, pure) ----------

  /**
   * Produces a deterministic idempotency key from orderId + attempt number.
   * Format: `simket_pi_{orderId}_{attempt}` for traceability.
   *
   * Docs: https://stripe.com/docs/api/idempotent_requests
   */
  static generateIdempotencyKey(orderId: string, attempt: number): string {
    return `simket_pi_${orderId}_${attempt}`;
  }

  /**
   * Produces a deterministic idempotency key for transfer creation.
   *
   * Docs: https://stripe.com/docs/api/idempotent_requests
   */
  static generateTransferIdempotencyKey(settlementId: string, attempt: number): string {
    return `simket_tr_${settlementId}_${attempt}`;
  }
}
