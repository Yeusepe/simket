/**
 * Tests: Hyperswitch payment orchestration service.
 *
 * Governing docs:
 *   - docs/architecture.md (§4 System boundary, §5 Service ownership)
 *   - docs/service-architecture.md (§1.13 Hyperswitch)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.hyperswitch.io/learn-more/sdk-reference/node
 *   - https://api-reference.hyperswitch.io/
 * Tests:
 *   - packages/vendure-server/src/features/hyperswitch/hyperswitch.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import { HyperswitchService } from './hyperswitch.service.js';
import type {
  CaptureHyperswitchPaymentParams,
  ConfirmHyperswitchPaymentParams,
  CreateHyperswitchPaymentParams,
  HyperswitchServiceConfig,
  RefundHyperswitchPaymentParams,
} from './hyperswitch.types.js';

function createClient() {
  return {
    setHost: vi.fn(),
    paymentIntents: {
      create: vi.fn(),
      confirm: vi.fn(),
      capture: vi.fn(),
      retrieve: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
  };
}

const TEST_CONFIG: HyperswitchServiceConfig = {
  apiKey: 'snd_test_key',
  baseUrl: 'https://sandbox.hyperswitch.io',
};

describe('HyperswitchService', () => {
  it('configures the SDK host from baseUrl', () => {
    const client = createClient();

    new HyperswitchService(TEST_CONFIG, client);

    expect(client.setHost).toHaveBeenCalledWith('sandbox.hyperswitch.io', '443', 'https');
  });

  it('creates a payment intent through the SDK', async () => {
    const client = createClient();
    client.paymentIntents.create.mockResolvedValue({
      payment_id: 'pay_123',
      merchant_id: 'merchant_123',
      status: 'requires_confirmation',
      amount: 5000,
      net_amount: 5000,
      amount_capturable: 5000,
      currency: 'USD',
      client_secret: 'pay_123_secret',
      connector: 'stripe',
      description: 'Order #1',
    });
    const service = new HyperswitchService(TEST_CONFIG, client);
    const params: CreateHyperswitchPaymentParams = {
      paymentId: 'pay_123',
      amount: 5000,
      currency: 'usd',
      captureMethod: 'manual',
      customerId: 'cust_123',
      description: 'Order #1',
      returnUrl: 'https://simket.test/return',
      merchantOrderReferenceId: 'ORDER-1',
      orderDetails: [{ productName: 'Terrain Pack', quantity: 1, amount: 5000 }],
      splitPayments: {
        stripeSplitPayment: {
          chargeType: 'direct',
          applicationFees: 500,
          transferAccountId: 'acct_creator_123',
        },
      },
      metadata: { orderId: 'order-1' },
    };

    const result = await service.createPayment(params);

    expect(client.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_id: 'pay_123',
        amount: 5000,
        currency: 'USD',
        capture_method: 'manual',
        customer_id: 'cust_123',
        description: 'Order #1',
        return_url: 'https://simket.test/return',
        merchant_order_reference_id: 'ORDER-1',
        order_details: [{ product_name: 'Terrain Pack', quantity: 1, amount: 5000 }],
        split_payments: {
          stripe_split_payment: {
            charge_type: 'direct',
            application_fees: 500,
            transfer_account_id: 'acct_creator_123',
          },
        },
        metadata: { orderId: 'order-1' },
      }),
    );
    expect(result).toMatchObject({
      paymentId: 'pay_123',
      status: 'requires_confirmation',
      clientSecret: 'pay_123_secret',
      currency: 'USD',
    });
  });

  it('confirms a payment', async () => {
    const client = createClient();
    client.paymentIntents.confirm.mockResolvedValue({
      payment_id: 'pay_123',
      merchant_id: 'merchant_123',
      status: 'succeeded',
      amount: 5000,
      net_amount: 5000,
      amount_capturable: 0,
      amount_received: 5000,
      currency: 'USD',
    });
    const service = new HyperswitchService(TEST_CONFIG, client);
    const params: ConfirmHyperswitchPaymentParams = {
      paymentMethod: 'card',
      clientSecret: 'pay_123_secret',
      returnUrl: 'https://simket.test/return',
      amount: 5000,
    };

    const result = await service.confirmPayment('pay_123', params);

    expect(client.paymentIntents.confirm).toHaveBeenCalledWith(
      'pay_123',
      expect.objectContaining({
        payment_method: 'card',
        client_secret: 'pay_123_secret',
        return_url: 'https://simket.test/return',
        amount: 5000,
      }),
    );
    expect(result.status).toBe('succeeded');
  });

  it('captures a payment', async () => {
    const client = createClient();
    client.paymentIntents.capture.mockResolvedValue({
      payment_id: 'pay_123',
      merchant_id: 'merchant_123',
      status: 'succeeded',
      amount: 5000,
      net_amount: 5000,
      amount_capturable: 0,
      amount_received: 5000,
      currency: 'USD',
    });
    const service = new HyperswitchService(TEST_CONFIG, client);
    const params: CaptureHyperswitchPaymentParams = {
      amountToCapture: 5000,
      refundUncapturedAmount: false,
    };

    await service.capturePayment('pay_123', params);

    expect(client.paymentIntents.capture).toHaveBeenCalledWith('pay_123', {
      amount_to_capture: 5000,
      refund_uncaptured_amount: false,
    });
  });

  it('creates a refund', async () => {
    const client = createClient();
    client.refunds.create.mockResolvedValue({
      refund_id: 'ref_123',
      payment_id: 'pay_123',
      amount: 2500,
      currency: 'USD',
      status: 'pending',
      reason: 'requested_by_customer',
    });
    const service = new HyperswitchService(TEST_CONFIG, client);
    const params: RefundHyperswitchPaymentParams = {
      paymentId: 'pay_123',
      refundId: 'ref_123',
      amount: 2500,
      reason: 'requested_by_customer',
      splitRefunds: {
        stripeSplitRefund: {
          revertPlatformFee: true,
          revertTransfer: true,
        },
      },
      metadata: { orderId: 'order-1' },
    };

    const result = await service.refundPayment(params);

    expect(client.refunds.create).toHaveBeenCalledWith({
      payment_id: 'pay_123',
      refund_id: 'ref_123',
      amount: 2500,
      reason: 'requested_by_customer',
      split_refunds: {
        stripe_split_refund: {
          revert_platform_fee: true,
          revert_transfer: true,
        },
      },
      metadata: { orderId: 'order-1' },
    });
    expect(result).toMatchObject({
      refundId: 'ref_123',
      paymentId: 'pay_123',
      amount: 2500,
      currency: 'USD',
      status: 'pending',
    });
  });

  it('retrieves a payment', async () => {
    const client = createClient();
    client.paymentIntents.retrieve.mockResolvedValue({
      payment_id: 'pay_123',
      merchant_id: 'merchant_123',
      status: 'requires_capture',
      amount: 5000,
      net_amount: 5000,
      amount_capturable: 5000,
      amount_received: 0,
      currency: 'USD',
    });
    const service = new HyperswitchService(TEST_CONFIG, client);

    const result = await service.getPayment('pay_123');

    expect(client.paymentIntents.retrieve).toHaveBeenCalledWith('pay_123');
    expect(result).toMatchObject({
      paymentId: 'pay_123',
      status: 'requires_capture',
      amountCapturable: 5000,
    });
  });

  it('validates createPayment input', async () => {
    const service = new HyperswitchService(TEST_CONFIG, createClient());

    await expect(
      service.createPayment({ amount: 0, currency: 'usd' }),
    ).rejects.toThrow(/amount/i);
    await expect(
      service.createPayment({ amount: 1000, currency: '' }),
    ).rejects.toThrow(/currency/i);
  });
});
