/**
 * Purpose: Tests for SettlementService — collaboration revenue splitting logic.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 *   - docs/domain-model.md §Collaboration
 * External references:
 *   - https://api-reference.hyperswitch.io/v1/payouts/payouts--create
 *   - https://docs.hyperswitch.io/features/payment-flows/payouts
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCollaboratorSplits,
  validateSplitConfiguration,
  buildPayoutParams,
  SettlementError,
} from './settlement.service.js';
import type { CollaboratorShare, PayoutTarget } from './settlement.service.js';

describe('SettlementService', () => {
  const twoCollaborators: CollaboratorShare[] = [
    { collaboratorId: 'creator-1', sharePercent: 60, payoutAccountId: 'acct-1' },
    { collaboratorId: 'creator-2', sharePercent: 30, payoutAccountId: 'acct-2' },
  ];

  describe('calculateCollaboratorSplits', () => {
    it('calculates correct split amounts', () => {
      const result = calculateCollaboratorSplits(10000, twoCollaborators, 500);
      // Revenue after platform fee: 10000 - 500 = 9500
      // Creator-1: floor(9500 * 0.60) = 5700
      // Creator-2: floor(9500 * 0.30) = 2850
      // Owner remainder: 9500 - 5700 - 2850 = 950
      expect(result.collaboratorPayouts).toHaveLength(2);
      expect(result.collaboratorPayouts[0].amountCents).toBe(5700);
      expect(result.collaboratorPayouts[1].amountCents).toBe(2850);
      expect(result.ownerRemainderCents).toBe(950);
    });

    it('gives owner 100% when no collaborators', () => {
      const result = calculateCollaboratorSplits(10000, [], 500);
      expect(result.collaboratorPayouts).toHaveLength(0);
      expect(result.ownerRemainderCents).toBe(9500);
    });

    it('handles single collaborator at 100%', () => {
      const single: CollaboratorShare[] = [
        { collaboratorId: 'c1', sharePercent: 100, payoutAccountId: 'acct-1' },
      ];
      const result = calculateCollaboratorSplits(10000, single, 500);
      expect(result.collaboratorPayouts[0].amountCents).toBe(9500);
      expect(result.ownerRemainderCents).toBe(0);
    });

    it('floors individual amounts (no fractional cents)', () => {
      // 9999 cents * 0.33 = 3299.67 → 3299
      const collaborators: CollaboratorShare[] = [
        { collaboratorId: 'c1', sharePercent: 33, payoutAccountId: 'acct-1' },
      ];
      const result = calculateCollaboratorSplits(9999, collaborators, 0);
      expect(result.collaboratorPayouts[0].amountCents).toBe(3299);
      expect(result.ownerRemainderCents).toBe(6700);
    });

    it('ensures total payouts never exceed revenue after fees', () => {
      // Many collaborators with rounding
      const many: CollaboratorShare[] = [
        { collaboratorId: 'c1', sharePercent: 33, payoutAccountId: 'a1' },
        { collaboratorId: 'c2', sharePercent: 33, payoutAccountId: 'a2' },
        { collaboratorId: 'c3', sharePercent: 33, payoutAccountId: 'a3' },
      ];
      const result = calculateCollaboratorSplits(10001, many, 0);
      const totalPaid = result.collaboratorPayouts.reduce((s, p) => s + p.amountCents, 0);
      expect(totalPaid + result.ownerRemainderCents).toBe(10001);
      expect(result.ownerRemainderCents).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateSplitConfiguration', () => {
    it('accepts valid config (shares ≤ 100%)', () => {
      const result = validateSplitConfiguration(twoCollaborators);
      expect(result.valid).toBe(true);
    });

    it('rejects shares exceeding 100%', () => {
      const bad: CollaboratorShare[] = [
        { collaboratorId: 'c1', sharePercent: 60, payoutAccountId: 'a1' },
        { collaboratorId: 'c2', sharePercent: 50, payoutAccountId: 'a2' },
      ];
      const result = validateSplitConfiguration(bad);
      expect(result.valid).toBe(false);
    });

    it('rejects negative share percent', () => {
      const bad: CollaboratorShare[] = [
        { collaboratorId: 'c1', sharePercent: -10, payoutAccountId: 'a1' },
      ];
      const result = validateSplitConfiguration(bad);
      expect(result.valid).toBe(false);
    });

    it('rejects share above 100%', () => {
      const bad: CollaboratorShare[] = [
        { collaboratorId: 'c1', sharePercent: 101, payoutAccountId: 'a1' },
      ];
      const result = validateSplitConfiguration(bad);
      expect(result.valid).toBe(false);
    });

    it('rejects missing payout account', () => {
      const bad: CollaboratorShare[] = [
        { collaboratorId: 'c1', sharePercent: 50, payoutAccountId: '' },
      ];
      const result = validateSplitConfiguration(bad);
      expect(result.valid).toBe(false);
    });

    it('rejects duplicate collaborator IDs', () => {
      const bad: CollaboratorShare[] = [
        { collaboratorId: 'c1', sharePercent: 30, payoutAccountId: 'a1' },
        { collaboratorId: 'c1', sharePercent: 20, payoutAccountId: 'a2' },
      ];
      const result = validateSplitConfiguration(bad);
      expect(result.valid).toBe(false);
    });

    it('accepts empty collaborators (solo product)', () => {
      const result = validateSplitConfiguration([]);
      expect(result.valid).toBe(true);
    });
  });

  describe('buildPayoutParams', () => {
    it('builds payout params for a collaborator', () => {
      const target: PayoutTarget = {
        collaboratorId: 'c1',
        payoutAccountId: 'acct-1',
        amountCents: 5000,
      };
      const params = buildPayoutParams(target, 'USD', 'order-123');
      expect(params.amount).toBe(5000);
      expect(params.currency).toBe('USD');
      expect(params.payoutAccountId).toBe('acct-1');
      expect(params.metadata.orderId).toBe('order-123');
      expect(params.metadata.collaboratorId).toBe('c1');
    });
  });

  describe('SettlementError', () => {
    it('creates typed error', () => {
      const err = new SettlementError('SPLIT_EXCEEDS_100', 'shares > 100%');
      expect(err.code).toBe('SPLIT_EXCEEDS_100');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
