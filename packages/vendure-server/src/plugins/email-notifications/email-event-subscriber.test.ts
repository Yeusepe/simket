/**
 * Purpose: Unit tests for EmailEventSubscriber — verifies event-to-payload mapping.
 */
import { describe, it, expect } from 'vitest';
import { buildEmailPayload, EmailTemplateType, type EmailPayload } from './email-notifications.service.js';

describe('EmailEventSubscriber payload building', () => {
  it('builds ORDER_CONFIRMATION payload with correct fields', () => {
    const payload = buildEmailPayload({
      templateType: EmailTemplateType.ORDER_CONFIRMATION,
      recipientEmail: 'buyer@example.com',
      recipientName: 'Jane Doe',
      data: { orderId: 'ORD-123', orderTotal: '4999' },
    });

    expect(payload.to).toBe('buyer@example.com');
    expect(payload.recipientName).toBe('Jane Doe');
    expect(payload.templateType).toBe(EmailTemplateType.ORDER_CONFIRMATION);
    expect(payload.data.orderId).toBe('ORD-123');
    expect(payload.subject).toBeTruthy();
  });

  it('builds COLLABORATION_INVITE payload', () => {
    const payload = buildEmailPayload({
      templateType: EmailTemplateType.COLLABORATION_INVITE,
      recipientEmail: 'collab@example.com',
      recipientName: 'Collaborator',
      data: { productName: 'Cool Asset', inviterName: 'Creator' },
    });

    expect(payload.templateType).toBe(EmailTemplateType.COLLABORATION_INVITE);
    expect(payload.to).toBe('collab@example.com');
  });

  it('builds SETTLEMENT_COMPLETE payload', () => {
    const payload = buildEmailPayload({
      templateType: EmailTemplateType.SETTLEMENT_COMPLETE,
      recipientEmail: 'creator@example.com',
      recipientName: 'Creator',
      data: { amount: '5000', currency: 'USD' },
    });

    expect(payload.templateType).toBe(EmailTemplateType.SETTLEMENT_COMPLETE);
  });
});
