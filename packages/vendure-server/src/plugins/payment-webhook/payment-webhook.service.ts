/**
 * Purpose: Hyperswitch webhook event processing — parses events, verifies signatures,
 * and determines order lifecycle actions.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 *   - docs/service-architecture.md §1.13 (Hyperswitch API contract)
 * External references:
 *   - https://docs.hyperswitch.io/explore-hyperswitch/webhooks
 *   - https://api-reference.hyperswitch.io/#tag/Payments
 * Tests:
 *   - packages/vendure-server/src/plugins/payment-webhook/payment-webhook.service.test.ts
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Hyperswitch webhook event types we handle.
 *
 * Docs: https://docs.hyperswitch.io/explore-hyperswitch/webhooks
 */
export enum WebhookEventType {
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILURE = 'PAYMENT_FAILURE',
  REFUND_SUCCESS = 'REFUND_SUCCESS',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  UNKNOWN = 'UNKNOWN',
}

/** Order lifecycle action to perform after webhook processing. */
export type OrderAction = 'FULFILL' | 'CANCEL' | 'REFUND' | 'DISPUTE' | 'NONE';

/** Map raw Hyperswitch event string → our internal enum. */
const EVENT_MAP: Record<string, WebhookEventType> = {
  payment_intent_success: WebhookEventType.PAYMENT_SUCCESS,
  payment_intent_failure: WebhookEventType.PAYMENT_FAILURE,
  refund_success: WebhookEventType.REFUND_SUCCESS,
  dispute_opened: WebhookEventType.DISPUTE_OPENED,
};

/**
 * Parse a raw Hyperswitch webhook event type string into our typed enum.
 */
export function parseWebhookEventType(raw: string): WebhookEventType {
  return EVENT_MAP[raw] ?? WebhookEventType.UNKNOWN;
}

export function isPaymentSuccessEvent(eventType: WebhookEventType): boolean {
  return eventType === WebhookEventType.PAYMENT_SUCCESS;
}

export function isPaymentFailureEvent(eventType: WebhookEventType): boolean {
  return eventType === WebhookEventType.PAYMENT_FAILURE;
}

export function isRefundEvent(eventType: WebhookEventType): boolean {
  return eventType === WebhookEventType.REFUND_SUCCESS;
}

/**
 * Safely extract payment_id from Hyperswitch webhook payload.
 *
 * Payload shape: `{ content: { object: { payment_id: string, ... } } }`
 * Docs: https://docs.hyperswitch.io/explore-hyperswitch/webhooks
 */
export function extractPaymentIdFromEvent(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const content = (payload as Record<string, unknown>).content;
  if (typeof content !== 'object' || content === null) return null;
  const obj = (content as Record<string, unknown>).object;
  if (typeof obj !== 'object' || obj === null) return null;
  const paymentId = (obj as Record<string, unknown>).payment_id;
  return typeof paymentId === 'string' ? paymentId : null;
}

/**
 * Extract the Vendure order ID from Hyperswitch webhook metadata or
 * merchant_order_reference_id.
 */
export function extractOrderIdFromEvent(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const content = (payload as Record<string, unknown>).content;
  if (typeof content !== 'object' || content === null) return null;
  const obj = (content as Record<string, unknown>).object;
  if (typeof obj !== 'object' || obj === null) return null;

  const record = obj as Record<string, unknown>;

  // Try metadata.orderId first (set by our checkout flow)
  const metadata = record.metadata;
  if (typeof metadata === 'object' && metadata !== null) {
    const orderId = (metadata as Record<string, unknown>).orderId;
    if (typeof orderId === 'string') return orderId;
  }

  // Fallback to merchant_order_reference_id
  const refId = record.merchant_order_reference_id;
  if (typeof refId === 'string') return refId;

  return null;
}

/**
 * Determine what order lifecycle action to take based on webhook event type.
 */
export function determineOrderAction(eventType: WebhookEventType): OrderAction {
  switch (eventType) {
    case WebhookEventType.PAYMENT_SUCCESS:
      return 'FULFILL';
    case WebhookEventType.PAYMENT_FAILURE:
      return 'CANCEL';
    case WebhookEventType.REFUND_SUCCESS:
      return 'REFUND';
    case WebhookEventType.DISPUTE_OPENED:
      return 'DISPUTE';
    default:
      return 'NONE';
  }
}

/**
 * Verify a Hyperswitch webhook HMAC-SHA256 signature.
 *
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * Docs: https://docs.hyperswitch.io/explore-hyperswitch/webhooks#signature-verification
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  const computed = createHmac('sha256', secret).update(body).digest('hex');

  if (computed.length !== signature.length) return false;

  return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(signature, 'hex'));
}
