/**
 * Tests: Stripe Connect integration — marketplace payments, destination charges,
 *        collaboration splits, webhook verification, idempotency.
 *
 * Governing docs:
 *   - docs/architecture.md (§7 Payments)
 *   - docs/service-architecture.md (Stripe integration)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://stripe.com/docs/connect/destination-charges
 *   - https://stripe.com/docs/api/payment_intents/create
 *   - https://stripe.com/docs/webhooks/signatures
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeService } from './stripe.service.js';
import type {
  StripeConnectConfig,
  CreatePaymentIntentParams,
  CollaborationSplit,
  CreateTransferParams,
} from './stripe.types.js';
import type Stripe from 'stripe';

// ---------- helpers ----------

/**
 * Builds a minimal mock Stripe SDK instance for unit testing.
 * Only the methods exercised by StripeService are stubbed.
 */
function createMockStripe(overrides: {
  accountsCreate?: ReturnType<typeof vi.fn>;
  accountLinksCreate?: ReturnType<typeof vi.fn>;
  paymentIntentsCreate?: ReturnType<typeof vi.fn>;
  transfersCreate?: ReturnType<typeof vi.fn>;
  webhooksConstructEvent?: ReturnType<typeof vi.fn>;
} = {}) {
  return {
    accounts: {
      create: overrides.accountsCreate ?? vi.fn(),
    },
    accountLinks: {
      create: overrides.accountLinksCreate ?? vi.fn(),
    },
    paymentIntents: {
      create: overrides.paymentIntentsCreate ?? vi.fn(),
    },
    transfers: {
      create: overrides.transfersCreate ?? vi.fn(),
    },
    webhooks: {
      constructEvent: overrides.webhooksConstructEvent ?? vi.fn(),
    },
  } as unknown as Stripe;
}

const TEST_CONFIG: StripeConnectConfig = {
  webhookSecret: 'whsec_test_secret',
  platformAccountId: 'acct_platform',
};

function createService(stripe: Stripe, config?: Partial<StripeConnectConfig>) {
  return new StripeService(stripe, { ...TEST_CONFIG, ...config });
}

// ---------- createConnectAccountLink ----------

describe('StripeService.createConnectAccountLink', () => {
  it('validates creatorId is non-empty', async () => {
    const svc = createService(createMockStripe());
    await expect(
      svc.createConnectAccountLink('', 'https://example.com/return', 'https://example.com/refresh'),
    ).rejects.toThrow(/creatorId/i);
  });

  it('validates returnUrl is non-empty', async () => {
    const svc = createService(createMockStripe());
    await expect(
      svc.createConnectAccountLink('creator-1', '', 'https://example.com/refresh'),
    ).rejects.toThrow(/returnUrl/i);
  });

  it('validates refreshUrl is non-empty', async () => {
    const svc = createService(createMockStripe());
    await expect(
      svc.createConnectAccountLink('creator-1', 'https://example.com/return', ''),
    ).rejects.toThrow(/refreshUrl/i);
  });

  it('creates an Express account and returns an account link URL', async () => {
    const accountsCreate = vi.fn().mockResolvedValue({ id: 'acct_123' });
    const accountLinksCreate = vi.fn().mockResolvedValue({
      url: 'https://connect.stripe.com/setup/abc',
    });
    const stripe = createMockStripe({ accountsCreate, accountLinksCreate });
    const svc = createService(stripe);

    const result = await svc.createConnectAccountLink(
      'creator-1',
      'https://example.com/return',
      'https://example.com/refresh',
    );

    expect(result.accountId).toBe('acct_123');
    expect(result.url).toBe('https://connect.stripe.com/setup/abc');

    expect(accountsCreate).toHaveBeenCalledOnce();
    const accountParams = accountsCreate.mock.calls[0]![0];
    expect(accountParams.type).toBe('express');
    expect(accountParams.metadata).toEqual({ creatorId: 'creator-1' });

    expect(accountLinksCreate).toHaveBeenCalledOnce();
    const linkParams = accountLinksCreate.mock.calls[0]![0];
    expect(linkParams.account).toBe('acct_123');
    expect(linkParams.type).toBe('account_onboarding');
    expect(linkParams.return_url).toBe('https://example.com/return');
    expect(linkParams.refresh_url).toBe('https://example.com/refresh');
  });
});

// ---------- createPaymentIntent ----------

describe('StripeService.createPaymentIntent', () => {
  it('validates amount > 0', async () => {
    const svc = createService(createMockStripe());
    await expect(
      svc.createPaymentIntent({
        amount: 0,
        currencyCode: 'usd',
        customerId: 'cus_1',
        connectedAccountId: 'acct_1',
        applicationFeeAmount: 100,
        idempotencyKey: 'key-1',
      }),
    ).rejects.toThrow(/amount/i);
  });

  it('validates amount is a positive integer', async () => {
    const svc = createService(createMockStripe());
    await expect(
      svc.createPaymentIntent({
        amount: -500,
        currencyCode: 'usd',
        customerId: 'cus_1',
        connectedAccountId: 'acct_1',
        applicationFeeAmount: 100,
        idempotencyKey: 'key-1',
      }),
    ).rejects.toThrow(/amount/i);
  });

  it('validates currencyCode is non-empty', async () => {
    const svc = createService(createMockStripe());
    await expect(
      svc.createPaymentIntent({
        amount: 1000,
        currencyCode: '',
        customerId: 'cus_1',
        connectedAccountId: 'acct_1',
        applicationFeeAmount: 100,
        idempotencyKey: 'key-1',
      }),
    ).rejects.toThrow(/currencyCode/i);
  });

  it('creates a PaymentIntent with destination charge', async () => {
    const paymentIntentsCreate = vi.fn().mockResolvedValue({
      id: 'pi_abc',
      status: 'requires_payment_method',
      client_secret: 'pi_abc_secret_xyz',
    });
    const stripe = createMockStripe({ paymentIntentsCreate });
    const svc = createService(stripe);

    const result = await svc.createPaymentIntent({
      amount: 5000,
      currencyCode: 'usd',
      customerId: 'cus_1',
      connectedAccountId: 'acct_connected',
      applicationFeeAmount: 500,
      idempotencyKey: 'idem-key-1',
      transferGroup: 'ORDER-1',
      metadata: { orderId: 'order-1' },
    });

    expect(result.paymentIntentId).toBe('pi_abc');
    expect(result.status).toBe('requires_payment_method');
    expect(result.clientSecret).toBe('pi_abc_secret_xyz');

    expect(paymentIntentsCreate).toHaveBeenCalledOnce();
    const [params, opts] = paymentIntentsCreate.mock.calls[0]!;
    expect(params.amount).toBe(5000);
    expect(params.currency).toBe('usd');
    expect(params.customer).toBe('cus_1');
    expect(params.application_fee_amount).toBe(500);
    expect(params.transfer_data).toEqual({ destination: 'acct_connected' });
    expect(params.transfer_group).toBe('ORDER-1');
    expect(params.metadata).toEqual({ orderId: 'order-1' });
    expect(opts.idempotencyKey).toBe('idem-key-1');
  });

  it('creates a PaymentIntent without connected account (platform-only)', async () => {
    const paymentIntentsCreate = vi.fn().mockResolvedValue({
      id: 'pi_def',
      status: 'requires_payment_method',
      client_secret: 'pi_def_secret',
    });
    const stripe = createMockStripe({ paymentIntentsCreate });
    const svc = createService(stripe);

    const result = await svc.createPaymentIntent({
      amount: 2000,
      currencyCode: 'eur',
      idempotencyKey: 'idem-2',
    });

    expect(result.paymentIntentId).toBe('pi_def');

    const [params] = paymentIntentsCreate.mock.calls[0]!;
    expect(params.transfer_data).toBeUndefined();
    expect(params.application_fee_amount).toBeUndefined();
    expect(params.customer).toBeUndefined();
  });
});

// ---------- calculateApplicationFee ----------

describe('StripeService.calculateApplicationFee', () => {
  it('calculates fee correctly for 10% of 5000', () => {
    expect(StripeService.calculateApplicationFee(5000, 10)).toBe(500);
  });

  it('calculates fee correctly for 15% of 10000', () => {
    expect(StripeService.calculateApplicationFee(10000, 15)).toBe(1500);
  });

  it('rounds to nearest integer (no fractional cents)', () => {
    // 7.5% of 1001 = 75.075 → rounds to 75
    expect(StripeService.calculateApplicationFee(1001, 7.5)).toBe(75);
  });

  it('rounds 0.5 up (banker-safe rounding)', () => {
    // 10% of 1005 = 100.5 → rounds to 101
    expect(StripeService.calculateApplicationFee(1005, 10)).toBe(101);
  });

  it('returns 0 for 0% take rate', () => {
    expect(StripeService.calculateApplicationFee(5000, 0)).toBe(0);
  });

  it('throws for negative amount', () => {
    expect(() => StripeService.calculateApplicationFee(-100, 10)).toThrow(/amount/i);
  });

  it('throws for negative takeRate', () => {
    expect(() => StripeService.calculateApplicationFee(1000, -5)).toThrow(/takeRate/i);
  });

  it('throws for takeRate > 100', () => {
    expect(() => StripeService.calculateApplicationFee(1000, 101)).toThrow(/takeRate/i);
  });
});

// ---------- calculateCollaborationSplits ----------

describe('StripeService.calculateCollaborationSplits', () => {
  it('splits correctly between two creators', () => {
    const splits: CollaborationSplit[] = [
      { creatorId: 'c1', stripeAccountId: 'acct_1', sharePercent: 60 },
      { creatorId: 'c2', stripeAccountId: 'acct_2', sharePercent: 40 },
    ];
    const result = StripeService.calculateCollaborationSplits(10000, 1000, splits);

    // distributable = 10000 - 1000 = 9000
    // c1: 60% of 9000 = 5400
    // c2: 40% of 9000 = 3600
    expect(result).toEqual([
      { creatorId: 'c1', stripeAccountId: 'acct_1', amount: 5400 },
      { creatorId: 'c2', stripeAccountId: 'acct_2', amount: 3600 },
    ]);
  });

  it('handles rounding — remainder goes to first creator', () => {
    const splits: CollaborationSplit[] = [
      { creatorId: 'c1', stripeAccountId: 'acct_1', sharePercent: 33.33 },
      { creatorId: 'c2', stripeAccountId: 'acct_2', sharePercent: 33.33 },
      { creatorId: 'c3', stripeAccountId: 'acct_3', sharePercent: 33.34 },
    ];
    const result = StripeService.calculateCollaborationSplits(10000, 1000, splits);

    // distributable = 9000
    // c1: floor(33.33% of 9000) = floor(2999.7) = 2999
    // c2: floor(33.33% of 9000) = 2999
    // c3: floor(33.34% of 9000) = floor(3000.6) = 3000
    // sum = 8998, remainder = 2
    // remainder goes to first creator: c1 gets 2999 + 2 = 3001
    const total = result.reduce((s, r) => s + r.amount, 0);
    expect(total).toBe(9000);
  });

  it('throws when shares do not sum to 100', () => {
    const splits: CollaborationSplit[] = [
      { creatorId: 'c1', stripeAccountId: 'acct_1', sharePercent: 50 },
      { creatorId: 'c2', stripeAccountId: 'acct_2', sharePercent: 30 },
    ];
    expect(() =>
      StripeService.calculateCollaborationSplits(10000, 1000, splits),
    ).toThrow(/sum.*100/i);
  });

  it('throws when platformFee exceeds amount', () => {
    const splits: CollaborationSplit[] = [
      { creatorId: 'c1', stripeAccountId: 'acct_1', sharePercent: 100 },
    ];
    expect(() =>
      StripeService.calculateCollaborationSplits(1000, 1500, splits),
    ).toThrow(/platformFee/i);
  });

  it('throws when splits array is empty', () => {
    expect(() =>
      StripeService.calculateCollaborationSplits(10000, 1000, []),
    ).toThrow(/splits/i);
  });
});

// ---------- createTransfer ----------

describe('StripeService.createTransfer', () => {
  it('validates amount > 0', async () => {
    const svc = createService(createMockStripe());
    await expect(
      svc.createTransfer({
        amount: 0,
        currencyCode: 'usd',
        destinationAccountId: 'acct_1',
        transferGroup: 'ORDER-1',
        idempotencyKey: 'idem-1',
      }),
    ).rejects.toThrow(/amount/i);
  });

  it('creates a transfer with source_transaction and idempotency key', async () => {
    const transfersCreate = vi.fn().mockResolvedValue({
      id: 'tr_123',
      amount: 1500,
      currency: 'usd',
      destination: 'acct_1',
      transfer_group: 'ORDER-1',
      source_transaction: 'ch_123',
    });
    const svc = createService(createMockStripe({ transfersCreate }));

    const result = await svc.createTransfer({
      amount: 1500,
      currencyCode: 'usd',
      destinationAccountId: 'acct_1',
      transferGroup: 'ORDER-1',
      sourceTransactionId: 'ch_123',
      idempotencyKey: 'idem-1',
      metadata: { settlementId: 'set_1' },
    });

    expect(result).toEqual({
      transferId: 'tr_123',
      destinationAccountId: 'acct_1',
      amount: 1500,
      currencyCode: 'usd',
      transferGroup: 'ORDER-1',
      sourceTransactionId: 'ch_123',
    });

    expect(transfersCreate).toHaveBeenCalledWith(
      {
        amount: 1500,
        currency: 'usd',
        destination: 'acct_1',
        transfer_group: 'ORDER-1',
        source_transaction: 'ch_123',
        metadata: { settlementId: 'set_1' },
      },
      { idempotencyKey: 'idem-1' },
    );
  });
});

// ---------- verifyWebhookSignature ----------

describe('StripeService.verifyWebhookSignature', () => {
  it('returns event on valid signature', () => {
    const fakeEvent = {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1' } },
    } as unknown as Stripe.Event;

    const webhooksConstructEvent = vi.fn().mockReturnValue(fakeEvent);
    const stripe = createMockStripe({ webhooksConstructEvent });
    const svc = createService(stripe);

    const result = svc.verifyWebhookSignature('raw-body', 'sig-header');

    expect(result).toBe(fakeEvent);
    expect(webhooksConstructEvent).toHaveBeenCalledWith(
      'raw-body',
      'sig-header',
      'whsec_test_secret',
    );
  });

  it('returns null on invalid signature', () => {
    const webhooksConstructEvent = vi.fn().mockImplementation(() => {
      throw new Error('Webhook signature verification failed');
    });
    const stripe = createMockStripe({ webhooksConstructEvent });
    const svc = createService(stripe);

    const result = svc.verifyWebhookSignature('bad-body', 'bad-sig');

    expect(result).toBeNull();
  });
});

// ---------- parsePaymentIntentEvent ----------

describe('StripeService.parsePaymentIntentEvent', () => {
  it('extracts payment_intent from payment_intent.succeeded event', () => {
    const event = {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_abc',
          amount: 5000,
          currency: 'usd',
          status: 'succeeded',
        },
      },
    } as unknown as Stripe.Event;

    const result = StripeService.parsePaymentIntentEvent(event);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('pi_abc');
  });

  it('returns null for non-payment_intent event types', () => {
    const event = {
      id: 'evt_2',
      type: 'customer.created',
      data: { object: { id: 'cus_1' } },
    } as unknown as Stripe.Event;

    const result = StripeService.parsePaymentIntentEvent(event);
    expect(result).toBeNull();
  });
});

// ---------- generateIdempotencyKey ----------

describe('StripeService.generateIdempotencyKey', () => {
  it('produces deterministic key from orderId + attempt', () => {
    const key1 = StripeService.generateIdempotencyKey('order-123', 1);
    const key2 = StripeService.generateIdempotencyKey('order-123', 1);
    expect(key1).toBe(key2);
  });

  it('produces different keys for different attempts', () => {
    const key1 = StripeService.generateIdempotencyKey('order-123', 1);
    const key2 = StripeService.generateIdempotencyKey('order-123', 2);
    expect(key1).not.toBe(key2);
  });

  it('produces different keys for different orderIds', () => {
    const key1 = StripeService.generateIdempotencyKey('order-123', 1);
    const key2 = StripeService.generateIdempotencyKey('order-456', 1);
    expect(key1).not.toBe(key2);
  });

  it('includes orderId in key for traceability', () => {
    const key = StripeService.generateIdempotencyKey('order-123', 1);
    expect(key).toContain('order-123');
  });
});

describe('StripeService.generateTransferIdempotencyKey', () => {
  it('produces deterministic key from settlementId + attempt', () => {
    expect(StripeService.generateTransferIdempotencyKey('settlement-1', 1)).toBe(
      'simket_tr_settlement-1_1',
    );
  });
});
