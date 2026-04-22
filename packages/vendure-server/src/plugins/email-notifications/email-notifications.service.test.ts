/**
 * Purpose: Tests for EmailNotificationService — email template rendering and
 * dispatch logic.
 *
 * Governing docs:
 *   - docs/architecture.md §12 (Notifications)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/worker-job-queue/
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  EmailTemplateType,
  buildEmailPayload,
  validateEmailAddress,
  renderSubjectLine,
} from './email-notifications.service.js';

describe('EmailNotificationService', () => {
  describe('buildEmailPayload', () => {
    it('builds order confirmation email', () => {
      const payload = buildEmailPayload({
        templateType: EmailTemplateType.ORDER_CONFIRMATION,
        recipientEmail: 'buyer@example.com',
        recipientName: 'Jane',
        data: { orderId: 'order-1', totalFormatted: '$15.00' },
      });
      expect(payload.to).toBe('buyer@example.com');
      expect(payload.templateType).toBe(EmailTemplateType.ORDER_CONFIRMATION);
      expect(payload.subject).toContain('order');
    });

    it('builds collaboration invite email', () => {
      const payload = buildEmailPayload({
        templateType: EmailTemplateType.COLLABORATION_INVITE,
        recipientEmail: 'collab@example.com',
        recipientName: 'Joe',
        data: { inviterName: 'Jane', productTitle: 'Avatar Pack' },
      });
      expect(payload.to).toBe('collab@example.com');
      expect(payload.subject).toContain('collaborate');
    });

    it('builds settlement complete email', () => {
      const payload = buildEmailPayload({
        templateType: EmailTemplateType.SETTLEMENT_COMPLETE,
        recipientEmail: 'creator@example.com',
        recipientName: 'Creator',
        data: { amountFormatted: '$47.50', orderId: 'order-99' },
      });
      expect(payload.templateType).toBe(EmailTemplateType.SETTLEMENT_COMPLETE);
    });
  });

  describe('validateEmailAddress', () => {
    it('accepts valid email', () => {
      expect(validateEmailAddress('user@example.com')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(validateEmailAddress('')).toBe(false);
    });

    it('rejects missing @', () => {
      expect(validateEmailAddress('userexample.com')).toBe(false);
    });

    it('rejects missing domain', () => {
      expect(validateEmailAddress('user@')).toBe(false);
    });

    it('rejects missing local part', () => {
      expect(validateEmailAddress('@example.com')).toBe(false);
    });
  });

  describe('renderSubjectLine', () => {
    it('renders order confirmation subject', () => {
      const subject = renderSubjectLine(
        EmailTemplateType.ORDER_CONFIRMATION,
        { orderId: 'order-1' },
      );
      expect(subject).toBe('Your Simket order #order-1 is confirmed');
    });

    it('renders collaboration invite subject', () => {
      const subject = renderSubjectLine(
        EmailTemplateType.COLLABORATION_INVITE,
        { inviterName: 'Alice' },
      );
      expect(subject).toBe('Alice invited you to collaborate on Simket');
    });

    it('renders settlement subject', () => {
      const subject = renderSubjectLine(
        EmailTemplateType.SETTLEMENT_COMPLETE,
        { amountFormatted: '$25.00' },
      );
      expect(subject).toBe('Your Simket payout of $25.00 is complete');
    });

    it('renders generic subject for unknown template', () => {
      const subject = renderSubjectLine(
        'UNKNOWN' as EmailTemplateType,
        {},
      );
      expect(subject).toBe('Notification from Simket');
    });
  });
});
