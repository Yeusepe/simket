/**
 * Purpose: Unit tests for PaymentWebhookController input validation and routing logic.
 * Tests:
 *   - Signature verification rejection
 *   - Event type parsing and action determination
 *   - Missing/malformed payload handling
 */
import { createHmac } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  parseWebhookEventType,
  extractPaymentIdFromEvent,
  extractOrderIdFromEvent,
  determineOrderAction,
  verifyWebhookSignature,
  WebhookEventType,
} from './payment-webhook.service.js';

describe('PaymentWebhookController logic', () => {
  describe('parseWebhookEventType', () => {
    it('parses payment_intent_success', () => {
      expect(parseWebhookEventType('payment_intent_success')).toBe(WebhookEventType.PAYMENT_SUCCESS);
    });

    it('parses payment_intent_failure', () => {
      expect(parseWebhookEventType('payment_intent_failure')).toBe(WebhookEventType.PAYMENT_FAILURE);
    });

    it('parses refund_success', () => {
      expect(parseWebhookEventType('refund_success')).toBe(WebhookEventType.REFUND_SUCCESS);
    });

    it('parses dispute_opened', () => {
      expect(parseWebhookEventType('dispute_opened')).toBe(WebhookEventType.DISPUTE_OPENED);
    });

    it('returns UNKNOWN for unrecognised events', () => {
      expect(parseWebhookEventType('some_new_event')).toBe(WebhookEventType.UNKNOWN);
    });
  });

  describe('determineOrderAction', () => {
    it('maps PAYMENT_SUCCESS to FULFILL', () => {
      expect(determineOrderAction(WebhookEventType.PAYMENT_SUCCESS)).toBe('FULFILL');
    });

    it('maps PAYMENT_FAILURE to CANCEL', () => {
      expect(determineOrderAction(WebhookEventType.PAYMENT_FAILURE)).toBe('CANCEL');
    });

    it('maps REFUND_SUCCESS to REFUND', () => {
      expect(determineOrderAction(WebhookEventType.REFUND_SUCCESS)).toBe('REFUND');
    });

    it('maps DISPUTE_OPENED to DISPUTE', () => {
      expect(determineOrderAction(WebhookEventType.DISPUTE_OPENED)).toBe('DISPUTE');
    });

    it('maps UNKNOWN to NONE', () => {
      expect(determineOrderAction(WebhookEventType.UNKNOWN)).toBe('NONE');
    });
  });

  describe('extractPaymentIdFromEvent', () => {
    it('extracts payment_id from valid payload', () => {
      const payload = { content: { object: { payment_id: 'pay_123abc' } } };
      expect(extractPaymentIdFromEvent(payload)).toBe('pay_123abc');
    });

    it('returns null for missing content', () => {
      expect(extractPaymentIdFromEvent({})).toBeNull();
    });

    it('returns null for null payload', () => {
      expect(extractPaymentIdFromEvent(null)).toBeNull();
    });

    it('returns null for non-string payment_id', () => {
      const payload = { content: { object: { payment_id: 12345 } } };
      expect(extractPaymentIdFromEvent(payload)).toBeNull();
    });
  });

  describe('extractOrderIdFromEvent', () => {
    it('extracts orderId from metadata', () => {
      const payload = { content: { object: { metadata: { orderId: 'ord_456' } } } };
      expect(extractOrderIdFromEvent(payload)).toBe('ord_456');
    });

    it('falls back to merchant_order_reference_id', () => {
      const payload = { content: { object: { merchant_order_reference_id: 'ord_789' } } };
      expect(extractOrderIdFromEvent(payload)).toBe('ord_789');
    });

    it('returns null for missing order references', () => {
      const payload = { content: { object: {} } };
      expect(extractOrderIdFromEvent(payload)).toBeNull();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('returns false for empty signature', () => {
      expect(verifyWebhookSignature('body', '', 'secret')).toBe(false);
    });

    it('returns false for empty secret', () => {
      expect(verifyWebhookSignature('body', 'sig', '')).toBe(false);
    });

    it('returns false for mismatched signature', () => {
      expect(verifyWebhookSignature('body', 'a'.repeat(64), 'secret')).toBe(false);
    });

    it('returns true for valid HMAC-SHA256 signature', () => {
      const body = '{"event_type":"payment_intent_success"}';
      const secret = 'test_webhook_secret';
      const sig = createHmac('sha256', secret).update(body).digest('hex');
      expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
    });
  });
});
