/**
 * Purpose: Unit tests for SvixEventSubscriber event type mapping.
 */
import { describe, it, expect } from 'vitest';
import { validateEventType } from './svix.service.js';

describe('SvixEventSubscriber event type mapping', () => {
  it('validates known product event types', () => {
    expect(validateEventType('product.created')).toBe(true);
    expect(validateEventType('product.updated')).toBe(true);
    expect(validateEventType('product.deleted')).toBe(true);
  });

  it('validates known order event types', () => {
    expect(validateEventType('order.completed')).toBe(true);
    expect(validateEventType('order.refunded')).toBe(true);
  });

  it('validates collaboration event types', () => {
    expect(validateEventType('collaboration.invited')).toBe(true);
    expect(validateEventType('collaboration.accepted')).toBe(true);
    expect(validateEventType('collaboration.revoked')).toBe(true);
  });

  it('validates asset event types', () => {
    expect(validateEventType('asset.processed')).toBe(true);
    expect(validateEventType('asset.failed')).toBe(true);
  });

  it('rejects unknown event types', () => {
    expect(validateEventType('unknown.event')).toBe(false);
    expect(validateEventType('')).toBe(false);
  });
});
