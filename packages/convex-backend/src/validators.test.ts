/**
 * Purpose: Unit tests for pure Convex workflow and notification validators.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.convex.dev/
 *   - https://docs.convex.dev/database/schemas
 * Tests:
 *   - packages/convex-backend/src/validators.test.ts
 */

import { describe, expect, it } from 'vitest';

import {
  buildWorkflowId,
  validateNotificationType,
  validateWorkflowTransition,
} from '../convex/lib/validators.js';

describe('validateWorkflowTransition', () => {
  it.each([
    ['pending', 'running'],
    ['running', 'completed'],
    ['running', 'failed'],
    ['pending', 'cancelled'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(validateWorkflowTransition(from, to)).toBe(true);
  });

  it.each([
    ['completed', 'running'],
    ['failed', 'running'],
  ] as const)('rejects terminal transition %s -> %s', (from, to) => {
    expect(validateWorkflowTransition(from, to)).toBe(false);
  });
});

describe('buildWorkflowId', () => {
  it('builds deterministic workflow IDs', () => {
    expect(buildWorkflowId('checkout', 'order_123')).toBe('checkout_order_123');
  });
});

describe('validateNotificationType', () => {
  it('accepts supported notification types', () => {
    expect(validateNotificationType('order.completed')).toBe(true);
  });

  it('rejects unsupported notification types', () => {
    expect(validateNotificationType('order.unknown')).toBe(false);
  });
});
