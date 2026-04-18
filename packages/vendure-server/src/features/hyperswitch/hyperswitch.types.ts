/**
 * Purpose: Hyperswitch payment orchestration types for Simket server integrations.
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

export interface HyperswitchServiceConfig {
  apiKey: string;
  baseUrl: string;
}

export type HyperswitchPaymentStatus =
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'processing'
  | 'requires_customer_action'
  | 'requires_merchant_action'
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_capture'
  | 'partially_captured'
  | 'partially_captured_and_capturable';

export interface HyperswitchOrderDetail {
  productName: string;
  quantity: number;
  amount: number;
  productId?: string;
  productImageUrl?: string;
  taxRate?: number;
  totalTaxAmount?: number;
  requiresShipping?: boolean;
}

export interface HyperswitchStripeSplitPayment {
  chargeType: 'direct' | 'destination';
  applicationFees: number;
  transferAccountId: string;
}

export interface HyperswitchSplitPayments {
  stripeSplitPayment: HyperswitchStripeSplitPayment;
}

export interface HyperswitchStripeSplitRefund {
  revertPlatformFee?: boolean;
  revertTransfer?: boolean;
}

export interface HyperswitchSplitRefunds {
  stripeSplitRefund: HyperswitchStripeSplitRefund;
}

export interface CreateHyperswitchPaymentParams {
  amount: number;
  currency: string;
  paymentId?: string;
  customerId?: string;
  captureMethod?: 'automatic' | 'manual';
  amountToCapture?: number;
  description?: string;
  returnUrl?: string;
  confirm?: boolean;
  clientSecret?: string;
  merchantOrderReferenceId?: string;
  metadata?: Record<string, string>;
  orderDetails?: HyperswitchOrderDetail[];
  splitPayments?: HyperswitchSplitPayments;
}

export interface ConfirmHyperswitchPaymentParams {
  amount?: number;
  currency?: string;
  amountToCapture?: number;
  returnUrl?: string;
  clientSecret?: string;
  paymentMethod?: string;
  paymentMethodData?: unknown;
  paymentToken?: string;
}

export interface CaptureHyperswitchPaymentParams {
  amountToCapture: number;
  refundUncapturedAmount?: boolean;
  statementDescriptorSuffix?: string;
  statementDescriptorPrefix?: string;
}

export interface RefundHyperswitchPaymentParams {
  paymentId: string;
  refundId?: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, string>;
  splitRefunds?: HyperswitchSplitRefunds;
}

export interface HyperswitchPayment {
  paymentId: string;
  merchantId: string;
  status: HyperswitchPaymentStatus | string;
  amount: number;
  netAmount: number;
  amountCapturable: number;
  amountReceived: number | null;
  currency: string;
  clientSecret: string | null;
  connector: string | null;
  description: string | null;
  createdAt: string | null;
}

export interface HyperswitchRefund {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  reason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
