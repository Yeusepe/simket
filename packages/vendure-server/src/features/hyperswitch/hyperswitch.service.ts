/**
 * Purpose: Hyperswitch SDK wrapper for Simket payment creation, confirmation, capture,
 * refunds, and retrieval with resilience and tracing.
 * Governing docs:
 *   - docs/architecture.md (§4 System boundary, §5 Service ownership)
 *   - docs/service-architecture.md (§1.13 Hyperswitch)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.hyperswitch.io/learn-more/sdk-reference/node
 *   - https://api-reference.hyperswitch.io/
 *   - https://api-reference.hyperswitch.io/#tag/Payments
 *   - https://api-reference.hyperswitch.io/#tag/Refunds
 * Tests:
 *   - packages/vendure-server/src/features/hyperswitch/hyperswitch.service.test.ts
 */
import Hyperswitch from '@juspay-tech/hyperswitch-node';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { SERVICE_POLICIES } from '../../resilience/resilience.js';
import type {
  CaptureHyperswitchPaymentParams,
  ConfirmHyperswitchPaymentParams,
  CreateHyperswitchPaymentParams,
  HyperswitchOrderDetail,
  HyperswitchPayment,
  HyperswitchRefund,
  HyperswitchServiceConfig,
  RefundHyperswitchPaymentParams,
} from './hyperswitch.types.js';

interface HyperswitchClient {
  setHost(host: string, port?: string | number, protocol?: string): void;
  paymentIntents: {
    create(
      params: Hyperswitch.PaymentIntentCreateParams,
    ): Promise<Hyperswitch.PaymentIntentResponse>;
    confirm(
      id: string,
      params?: Hyperswitch.PaymentIntentConfirmParams,
    ): Promise<Hyperswitch.PaymentIntentResponse>;
    capture(
      id: string,
      params?: Hyperswitch.PaymentIntentCaptureParams,
    ): Promise<Hyperswitch.PaymentIntentResponse>;
    retrieve(id: string): Promise<Hyperswitch.PaymentIntentResponse>;
  };
  refunds: {
    create(params?: Hyperswitch.RefundsCreateParams): Promise<Hyperswitch.RefundsResponse>;
  };
}

const tracer = trace.getTracer('simket-hyperswitch');

export class HyperswitchService {
  private readonly client: HyperswitchClient;

  constructor(config: HyperswitchServiceConfig, client?: HyperswitchClient) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error('HyperswitchService: apiKey must not be empty');
    }
    if (!config.baseUrl || config.baseUrl.trim().length === 0) {
      throw new Error('HyperswitchService: baseUrl must not be empty');
    }

    this.client = client ?? (new Hyperswitch(config.apiKey) as unknown as HyperswitchClient);
    this.configureBaseUrl(config.baseUrl);
  }

  /**
   * Creates a payment intent through the official Hyperswitch Node SDK.
   *
   * Docs: https://docs.hyperswitch.io/learn-more/sdk-reference/node
   *       https://api-reference.hyperswitch.io/#tag/Payments
   * Endpoint: POST /payments
   * Verified in installed SDK types:
   *   - Hyperswitch.PaymentIntentsResource.create(params)
   *   - Hyperswitch.PaymentIntentCreateParams = PaymentsRequest
   */
  async createPayment(params: CreateHyperswitchPaymentParams): Promise<HyperswitchPayment> {
    this.assertPositiveAmount(params.amount, 'createPayment');
    this.assertCurrency(params.currency, 'createPayment');

    const request = compactObject({
      amount: params.amount,
      currency: normalizeCurrency(params.currency),
      payment_id: params.paymentId,
      customer_id: params.customerId,
      capture_method: params.captureMethod,
      amount_to_capture: params.amountToCapture,
      description: params.description,
      return_url: params.returnUrl,
      confirm: params.confirm,
      client_secret: params.clientSecret,
      merchant_order_reference_id: params.merchantOrderReferenceId,
      order_details: params.orderDetails?.map(mapOrderDetail),
      split_payments: params.splitPayments
        ? {
            stripe_split_payment: {
              charge_type: params.splitPayments.stripeSplitPayment.chargeType,
              application_fees: params.splitPayments.stripeSplitPayment.applicationFees,
              transfer_account_id: params.splitPayments.stripeSplitPayment.transferAccountId,
            },
          }
        : undefined,
      metadata: params.metadata,
      profile_id: null,
    }) as unknown as Hyperswitch.PaymentIntentCreateParams;

    return this.runWithSpan(
      'hyperswitch.createPayment',
      {
        'hyperswitch.payment_id': params.paymentId ?? '',
        'hyperswitch.amount': params.amount,
        'hyperswitch.currency': normalizeCurrency(params.currency),
      },
      async () => {
        const response = await this.client.paymentIntents.create(request);
        return normalizePayment(response);
      },
    );
  }

  /**
   * Confirms a previously created payment through the official Hyperswitch Node SDK.
   *
   * Docs: https://docs.hyperswitch.io/learn-more/sdk-reference/node
   *       https://api-reference.hyperswitch.io/#tag/Payments
   * Endpoint: POST /payments/{payment_id}/confirm
   * Verified in installed SDK types:
   *   - Hyperswitch.PaymentIntentsResource.confirm(id, params?)
   *   - Hyperswitch.PaymentIntentConfirmParams = PaymentsConfirmRequest
   */
  async confirmPayment(
    paymentId: string,
    params: ConfirmHyperswitchPaymentParams = {},
  ): Promise<HyperswitchPayment> {
    this.assertPaymentId(paymentId, 'confirmPayment');
    if (params.amount != null) {
      this.assertPositiveAmount(params.amount, 'confirmPayment');
    }
    if (params.currency != null) {
      this.assertCurrency(params.currency, 'confirmPayment');
    }

    const request = compactObject({
      amount: params.amount,
      currency: params.currency ? normalizeCurrency(params.currency) : undefined,
      amount_to_capture: params.amountToCapture,
      return_url: params.returnUrl,
      client_secret: params.clientSecret,
      payment_method: params.paymentMethod,
      payment_method_data: params.paymentMethodData,
      payment_token: params.paymentToken,
    }) as unknown as Hyperswitch.PaymentIntentConfirmParams;

    return this.runWithSpan(
      'hyperswitch.confirmPayment',
      { 'hyperswitch.payment_id': paymentId },
      async () => {
        const response = await this.client.paymentIntents.confirm(paymentId, request);
        return normalizePayment(response);
      },
    );
  }

  /**
   * Captures a payment through the official Hyperswitch Node SDK.
   *
   * Docs: https://docs.hyperswitch.io/learn-more/sdk-reference/node
   *       https://api-reference.hyperswitch.io/#tag/Payments
   * Endpoint: POST /payments/{payment_id}/capture
   * Verified in installed SDK types:
   *   - Hyperswitch.PaymentIntentsResource.capture(id, params?)
   *   - Hyperswitch.PaymentIntentCaptureParams = PaymentsCaptureRequest
   */
  async capturePayment(
    paymentId: string,
    params: CaptureHyperswitchPaymentParams,
  ): Promise<HyperswitchPayment> {
    this.assertPaymentId(paymentId, 'capturePayment');
    this.assertPositiveAmount(params.amountToCapture, 'capturePayment');

    const request = compactObject({
      amount_to_capture: params.amountToCapture,
      refund_uncaptured_amount: params.refundUncapturedAmount,
      statement_descriptor_suffix: params.statementDescriptorSuffix,
      statement_descriptor_prefix: params.statementDescriptorPrefix,
    }) as Hyperswitch.PaymentIntentCaptureParams;

    return this.runWithSpan(
      'hyperswitch.capturePayment',
      {
        'hyperswitch.payment_id': paymentId,
        'hyperswitch.amount_to_capture': params.amountToCapture,
      },
      async () => {
        const response = await this.client.paymentIntents.capture(paymentId, request);
        return normalizePayment(response);
      },
    );
  }

  /**
   * Creates a refund through the official Hyperswitch Node SDK.
   *
   * Docs: https://docs.hyperswitch.io/learn-more/sdk-reference/node
   *       https://api-reference.hyperswitch.io/#tag/Refunds
   * Endpoint: POST /refunds
   * Verified in installed SDK types:
   *   - Hyperswitch.RefundsResource.create(params?)
   *   - Hyperswitch.RefundsCreateParams = RefundRequest
   */
  async refundPayment(params: RefundHyperswitchPaymentParams): Promise<HyperswitchRefund> {
    this.assertPaymentId(params.paymentId, 'refundPayment');
    if (params.amount != null) {
      this.assertPositiveAmount(params.amount, 'refundPayment');
    }

    const request = compactObject({
      payment_id: params.paymentId,
      refund_id: params.refundId,
      amount: params.amount,
      reason: params.reason,
      metadata: params.metadata,
      split_refunds: params.splitRefunds
        ? {
            stripe_split_refund: {
              revert_platform_fee: params.splitRefunds.stripeSplitRefund.revertPlatformFee,
              revert_transfer: params.splitRefunds.stripeSplitRefund.revertTransfer,
            },
          }
        : undefined,
    }) as unknown as Hyperswitch.RefundsCreateParams;

    return this.runWithSpan(
      'hyperswitch.refundPayment',
      {
        'hyperswitch.payment_id': params.paymentId,
        'hyperswitch.refund_id': params.refundId ?? '',
      },
      async () => {
        const response = await this.client.refunds.create(request);
        return normalizeRefund(response);
      },
    );
  }

  /**
   * Retrieves a payment through the official Hyperswitch Node SDK.
   *
   * Docs: https://docs.hyperswitch.io/learn-more/sdk-reference/node
   *       https://api-reference.hyperswitch.io/#tag/Payments
   * Endpoint: GET /payments/{payment_id}
   * Verified in installed SDK types:
   *   - Hyperswitch.PaymentIntentsResource.retrieve(id)
   */
  async getPayment(paymentId: string): Promise<HyperswitchPayment> {
    this.assertPaymentId(paymentId, 'getPayment');

    return this.runWithSpan(
      'hyperswitch.getPayment',
      { 'hyperswitch.payment_id': paymentId },
      async () => {
        const response = await this.client.paymentIntents.retrieve(paymentId);
        return normalizePayment(response);
      },
    );
  }

  private configureBaseUrl(baseUrl: string): void {
    const url = new URL(baseUrl);
    const port = url.port || (url.protocol === 'http:' ? '80' : '443');
    this.client.setHost(url.hostname, port, url.protocol.replace(':', ''));
  }

  private async runWithSpan<T>(
    spanName: string,
    attributes: Record<string, string | number>,
    operation: () => Promise<T>,
  ): Promise<T> {
    return tracer.startActiveSpan(spanName, async (span) => {
      Object.entries(attributes).forEach(([key, value]) => {
        if (value !== '') {
          span.setAttribute(key, value);
        }
      });

      try {
        return await SERVICE_POLICIES.hyperswitch.execute(operation);
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private assertPositiveAmount(value: number, methodName: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${methodName}: amount must be a positive integer`);
    }
  }

  private assertCurrency(value: string, methodName: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error(`${methodName}: currency must not be empty`);
    }
  }

  private assertPaymentId(value: string, methodName: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error(`${methodName}: paymentId must not be empty`);
    }
  }
}

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

function mapOrderDetail(detail: HyperswitchOrderDetail) {
  return compactObject({
    product_name: detail.productName,
    quantity: detail.quantity,
    amount: detail.amount,
    product_id: detail.productId,
    product_img_link: detail.productImageUrl,
    tax_rate: detail.taxRate,
    total_tax_amount: detail.totalTaxAmount,
    requires_shipping: detail.requiresShipping,
  });
}

function normalizePayment(response: Hyperswitch.PaymentIntentResponse): HyperswitchPayment {
  return {
    paymentId: response.payment_id,
    merchantId: response.merchant_id,
    status: response.status,
    amount: response.amount,
    netAmount: response.net_amount,
    amountCapturable: response.amount_capturable,
    amountReceived: response.amount_received ?? null,
    currency: response.currency,
    clientSecret: response.client_secret ?? null,
    connector: response.connector ?? null,
    description: response.description ?? null,
    createdAt: response.created ?? null,
  };
}

function normalizeRefund(response: Hyperswitch.RefundsResponse): HyperswitchRefund {
  return {
    refundId: response.refund_id,
    paymentId: response.payment_id,
    amount: response.amount,
    currency: response.currency,
    status: response.status,
    reason: response.reason ?? null,
    createdAt: response.created_at ?? null,
    updatedAt: response.updated_at ?? null,
  };
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}
