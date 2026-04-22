/**
 * Purpose: Tests for PaymentWebhookService — Hyperswitch webhook event processing.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 *   - docs/service-architecture.md §1.13 (Hyperswitch API contract)
 * External references:
 *   - https://api-reference.hyperswitch.io/#tag/Payments
 *   - https://docs.hyperswitch.io/explore-hyperswitch/webhooks
 * Tests:
 *   - This file
 */

import { createHmac } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  parseWebhookEventType,
  isPaymentSuccessEvent,
  isPaymentFailureEvent,
  isRefundEvent,
  extractPaymentIdFromEvent,
  extractOrderIdFromEvent,
  determineOrderAction,
  verifyWebhookSignature,
  WebhookEventType,
} from './payment-webhook.service.js';

describe('PaymentWebhookService', () => {
  describe('parseWebhookEventType', () => {
    it('parses payment_intent_success', () => {
      expect(parseWebhookEventType('payment_intent_success')).toBe(
        WebhookEventType.PAYMENT_SUCCESS,
      );
    });

    it('parses payment_intent_failure', () => {
      expect(parseWebhookEventType('payment_intent_failure')).toBe(
        WebhookEventType.PAYMENT_FAILURE,
      );
    });

    it('parses refund_success', () => {
      expect(parseWebhookEventType('refund_success')).toBe(
        WebhookEventType.REFUND_SUCCESS,
      );
    });

    it('parses dispute_opened', () => {
      expect(parseWebhookEventType('dispute_opened')).toBe(
        WebhookEventType.DISPUTE_OPENED,
      );
    });

    it('returns UNKNOWN for unrecognized events', () => {
      expect(parseWebhookEventType('something_random')).toBe(
        WebhookEventType.UNKNOWN,
      );
    });

    it('handles empty string', () => {
      expect(parseWebhookEventType('')).toBe(WebhookEventType.UNKNOWN);
    });
  });

  describe('isPaymentSuccessEvent / isPaymentFailureEvent', () => {
    it('recognizes success events', () => {
      expect(isPaymentSuccessEvent(WebhookEventType.PAYMENT_SUCCESS)).toBe(true);
      expect(isPaymentSuccessEvent(WebhookEventType.PAYMENT_FAILURE)).toBe(false);
    });

    it('recognizes failure events', () => {
      expect(isPaymentFailureEvent(WebhookEventType.PAYMENT_FAILURE)).toBe(true);
      expect(isPaymentFailureEvent(WebhookEventType.PAYMENT_SUCCESS)).toBe(false);
    });
  });

  describe('isRefundEvent', () => {
    it('recognizes refund events', () => {
      expect(isRefundEvent(WebhookEventType.REFUND_SUCCESS)).toBe(true);
      expect(isRefundEvent(WebhookEventType.PAYMENT_SUCCESS)).toBe(false);
    });
  });

  describe('extractPaymentIdFromEvent', () => {
    it('extracts payment_id from webhook payload', () => {
      const payload = {
        content: {
          object: {
            payment_id: 'pay_abc123',
            status: 'succeeded',
          },
        },
      };
      expect(extractPaymentIdFromEvent(payload)).toBe('pay_abc123');
    });

    it('returns null for missing payment_id', () => {
      expect(extractPaymentIdFromEvent({})).toBeNull();
      expect(extractPaymentIdFromEvent({ content: {} })).toBeNull();
    });
  });

  describe('extractOrderIdFromEvent', () => {
    it('extracts orderId from metadata', () => {
      const payload = {
        content: {
          object: {
            payment_id: 'pay_1',
            metadata: { orderId: 'order-123' },
          },
        },
      };
      expect(extractOrderIdFromEvent(payload)).toBe('order-123');
    });

    it('extracts from merchant_order_reference_id', () => {
      const payload = {
        content: {
          object: {
            payment_id: 'pay_1',
            merchant_order_reference_id: 'order-456',
          },
        },
      };
      expect(extractOrderIdFromEvent(payload)).toBe('order-456');
    });

    it('returns null when neither present', () => {
      const payload = {
        content: { object: { payment_id: 'pay_1' } },
      };
      expect(extractOrderIdFromEvent(payload)).toBeNull();
    });
  });

  describe('determineOrderAction', () => {
    it('returns FULFILL for payment success', () => {
      expect(determineOrderAction(WebhookEventType.PAYMENT_SUCCESS)).toBe('FULFILL');
    });

    it('returns CANCEL for payment failure', () => {
      expect(determineOrderAction(WebhookEventType.PAYMENT_FAILURE)).toBe('CANCEL');
    });

    it('returns REFUND for refund success', () => {
      expect(determineOrderAction(WebhookEventType.REFUND_SUCCESS)).toBe('REFUND');
    });

    it('returns DISPUTE for dispute opened', () => {
      expect(determineOrderAction(WebhookEventType.DISPUTE_OPENED)).toBe('DISPUTE');
    });

    it('returns NONE for unknown event', () => {
      expect(determineOrderAction(WebhookEventType.UNKNOWN)).toBe('NONE');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('returns false for empty signature', () => {
      expect(verifyWebhookSignature('body', '', 'secret')).toBe(false);
    });

    it('returns false for empty secret', () => {
      expect(verifyWebhookSignature('body', 'sig', '')).toBe(false);
    });

    it('returns true for valid HMAC', () => {
      // The function computes HMAC-SHA256; use a known test vector
      const body = '{"event":"test"}';
      const secret = 'test-webhook-secret';
      // We compute expected in the function, so just verify consistent behavior:
      const expected = createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      expect(verifyWebhookSignature(body, expected, secret)).toBe(true);
    });

    it('returns false for tampered body', () => {
      const secret = 'test-secret';
      const validSig = createHmac('sha256', secret)
        .update('original')
        .digest('hex');
      expect(verifyWebhookSignature('tampered', validSig, secret)).toBe(false);
    });
  });
});
