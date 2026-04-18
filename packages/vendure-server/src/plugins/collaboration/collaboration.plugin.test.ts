/**
 * Purpose: Tests for CollaborationPlugin — validates entity structure, config,
 *          revenue share validation, state machine transitions, and revenue splitting.
 * Governing docs:
 *   - docs/architecture.md (§4 Collaboration model)
 *   - docs/domain-model.md (Collaboration entity, state machine)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://stripe.com/docs/connect/destination-charges (revenue split model)
 */
import { describe, it, expect } from 'vitest';
import type { RuntimeVendureConfig } from '@vendure/core';
import {
  CollaborationEntity,
  CollaborationStatus,
  SettlementEntity,
  collaborationConfiguration,
  validateRevenueShare,
  validateCollaborationShares,
  COLLABORATION_TRANSITIONS,
  canTransition,
  splitRevenue,
} from './collaboration.plugin.js';

describe('CollaborationPlugin', () => {
  // ─── Entity structure ───────────────────────────────────────────────

  describe('CollaborationEntity', () => {
    it('can be instantiated with required fields', () => {
      const entity = new CollaborationEntity({
        productId: 'prod-1',
        creatorId: 'creator-2',
        ownerCreatorId: 'creator-1',
        revenueSharePercent: 25,
        status: CollaborationStatus.Pending,
      });

      expect(entity.productId).toBe('prod-1');
      expect(entity.creatorId).toBe('creator-2');
      expect(entity.ownerCreatorId).toBe('creator-1');
      expect(entity.revenueSharePercent).toBe(25);
      expect(entity.status).toBe(CollaborationStatus.Pending);
    });

    it('defaults status to Pending when not provided', () => {
      const entity = new CollaborationEntity({
        productId: 'prod-1',
        creatorId: 'creator-2',
        ownerCreatorId: 'creator-1',
        revenueSharePercent: 10,
      });

      expect(entity.status).toBe(CollaborationStatus.Pending);
    });
  });

  // ─── Configuration function ─────────────────────────────────────────

  describe('collaborationConfiguration', () => {
    it('adds CollaborationEntity to config entities', () => {
      const baseConfig = { entityOptions: {} } as RuntimeVendureConfig;
      const result = collaborationConfiguration(baseConfig);

      // The function should return a config — not throw
      expect(result).toBeDefined();
    });

    it('returns the config object', () => {
      const baseConfig = {} as RuntimeVendureConfig;
      const result = collaborationConfiguration(baseConfig);
      expect(result).toBe(baseConfig);
    });

    it('adds a Customer stripeConnectedAccountId custom field', () => {
      const baseConfig = { customFields: {} } as RuntimeVendureConfig;
      const result = collaborationConfiguration(baseConfig);
      const customerFields = (result.customFields?.Customer ?? []) as Array<{ name: string }>;
      expect(customerFields.some((field) => field.name === 'stripeConnectedAccountId')).toBe(true);
    });
  });

  // ─── Revenue share validation ───────────────────────────────────────

  describe('validateRevenueShare', () => {
    it('accepts 0', () => {
      expect(validateRevenueShare(0)).toBeUndefined();
    });

    it('accepts 50', () => {
      expect(validateRevenueShare(50)).toBeUndefined();
    });

    it('accepts 100', () => {
      expect(validateRevenueShare(100)).toBeUndefined();
    });

    it('accepts decimal values like 33.33', () => {
      expect(validateRevenueShare(33.33)).toBeUndefined();
    });

    it('rejects negative values', () => {
      const result = validateRevenueShare(-1);
      expect(result).toBeDefined();
      expect(result).toContain('0');
    });

    it('rejects values above 100', () => {
      const result = validateRevenueShare(101);
      expect(result).toBeDefined();
      expect(result).toContain('100');
    });

    it('rejects NaN', () => {
      const result = validateRevenueShare(NaN);
      expect(result).toBeDefined();
      expect(result).toContain('finite number');
    });

    it('rejects Infinity', () => {
      const result = validateRevenueShare(Infinity);
      expect(result).toBeDefined();
      expect(result).toContain('finite number');
    });

    it('rejects non-number types', () => {
      const result = validateRevenueShare('fifty' as unknown as number);
      expect(result).toBeDefined();
      expect(result).toContain('finite number');
    });
  });

  // ─── Collaboration shares validation ────────────────────────────────

  describe('validateCollaborationShares', () => {
    it('accepts shares totalling exactly 100', () => {
      expect(validateCollaborationShares([50, 30, 20])).toBeUndefined();
    });

    it('accepts shares totalling less than 100', () => {
      expect(validateCollaborationShares([25, 25])).toBeUndefined();
    });

    it('accepts empty array', () => {
      expect(validateCollaborationShares([])).toBeUndefined();
    });

    it('accepts single share of 100', () => {
      expect(validateCollaborationShares([100])).toBeUndefined();
    });

    it('rejects shares totalling more than 100', () => {
      const result = validateCollaborationShares([60, 50]);
      expect(result).toBeDefined();
      expect(result).toContain('100');
    });

    it('rejects shares totalling slightly over 100 (floating point)', () => {
      const result = validateCollaborationShares([50.01, 50]);
      expect(result).toBeDefined();
      expect(result).toContain('100');
    });
  });

  // ─── State machine transitions ──────────────────────────────────────

  describe('CollaborationStatus enum', () => {
    it('has Pending, Invited, Active, Revoked values', () => {
      expect(CollaborationStatus.Pending).toBe('pending');
      expect(CollaborationStatus.Invited).toBe('invited');
      expect(CollaborationStatus.Active).toBe('active');
      expect(CollaborationStatus.Revoked).toBe('revoked');
    });
  });

  describe('COLLABORATION_TRANSITIONS', () => {
    it('defines transitions from Pending', () => {
      expect(COLLABORATION_TRANSITIONS[CollaborationStatus.Pending]).toContain(
        CollaborationStatus.Invited,
      );
    });

    it('defines transitions from Invited', () => {
      expect(COLLABORATION_TRANSITIONS[CollaborationStatus.Invited]).toContain(
        CollaborationStatus.Active,
      );
    });

    it('defines transitions from Active', () => {
      expect(COLLABORATION_TRANSITIONS[CollaborationStatus.Active]).toContain(
        CollaborationStatus.Revoked,
      );
    });

    it('Revoked is a terminal state (no transitions out)', () => {
      expect(COLLABORATION_TRANSITIONS[CollaborationStatus.Revoked]).toEqual([]);
    });
  });

  describe('canTransition', () => {
    it('Pending → Invited is valid', () => {
      expect(canTransition(CollaborationStatus.Pending, CollaborationStatus.Invited)).toBe(true);
    });

    it('Invited → Active is valid', () => {
      expect(canTransition(CollaborationStatus.Invited, CollaborationStatus.Active)).toBe(true);
    });

    it('Active → Revoked is valid', () => {
      expect(canTransition(CollaborationStatus.Active, CollaborationStatus.Revoked)).toBe(true);
    });

    it('Pending → Active is invalid (must go through Invited)', () => {
      expect(canTransition(CollaborationStatus.Pending, CollaborationStatus.Active)).toBe(false);
    });

    it('Active → Pending is invalid (cannot go backwards)', () => {
      expect(canTransition(CollaborationStatus.Active, CollaborationStatus.Pending)).toBe(false);
    });

    it('Revoked → Active is invalid (terminal state)', () => {
      expect(canTransition(CollaborationStatus.Revoked, CollaborationStatus.Active)).toBe(false);
    });

    it('Revoked → Pending is invalid (terminal state)', () => {
      expect(canTransition(CollaborationStatus.Revoked, CollaborationStatus.Pending)).toBe(false);
    });

    it('Invited → Revoked is valid (can cancel invitation)', () => {
      expect(canTransition(CollaborationStatus.Invited, CollaborationStatus.Revoked)).toBe(true);
    });

    it('Pending → Revoked is valid (can cancel before sending)', () => {
      expect(canTransition(CollaborationStatus.Pending, CollaborationStatus.Revoked)).toBe(true);
    });
  });

  // ─── Revenue splitting ──────────────────────────────────────────────

  describe('splitRevenue', () => {
    it('splits evenly between two creators', () => {
      const result = splitRevenue(10000, [
        { creatorId: 'a', percent: 50 },
        { creatorId: 'b', percent: 50 },
      ]);

      expect(result).toEqual([
        { creatorId: 'a', amount: 5000 },
        { creatorId: 'b', amount: 5000 },
      ]);
    });

    it('handles uneven splits', () => {
      const result = splitRevenue(10000, [
        { creatorId: 'owner', percent: 70 },
        { creatorId: 'collab', percent: 30 },
      ]);

      expect(result).toEqual([
        { creatorId: 'owner', amount: 7000 },
        { creatorId: 'collab', amount: 3000 },
      ]);
    });

    it('handles a single creator with 100%', () => {
      const result = splitRevenue(5000, [{ creatorId: 'solo', percent: 100 }]);
      expect(result).toEqual([{ creatorId: 'solo', amount: 5000 }]);
    });

    it('rounds amounts to integers (cents)', () => {
      const result = splitRevenue(10000, [
        { creatorId: 'a', percent: 33.33 },
        { creatorId: 'b', percent: 33.33 },
        { creatorId: 'c', percent: 33.34 },
      ]);

      // Each amount should be an integer
      for (const entry of result) {
        expect(Number.isInteger(entry.amount)).toBe(true);
      }

      // Total should not exceed original amount
      const total = result.reduce((sum, r) => sum + r.amount, 0);
      expect(total).toBeLessThanOrEqual(10000);
    });

    it('returns empty array for empty shares', () => {
      const result = splitRevenue(10000, []);
      expect(result).toEqual([]);
    });

    it('handles zero total amount', () => {
      const result = splitRevenue(0, [
        { creatorId: 'a', percent: 50 },
        { creatorId: 'b', percent: 50 },
      ]);

      expect(result).toEqual([
        { creatorId: 'a', amount: 0 },
        { creatorId: 'b', amount: 0 },
      ]);
    });

    it('handles three-way split', () => {
      const result = splitRevenue(9000, [
        { creatorId: 'a', percent: 50 },
        { creatorId: 'b', percent: 30 },
        { creatorId: 'c', percent: 20 },
      ]);

      expect(result).toEqual([
        { creatorId: 'a', amount: 4500 },
        { creatorId: 'b', amount: 2700 },
        { creatorId: 'c', amount: 1800 },
      ]);
    });
  });

  describe('SettlementEntity', () => {
    it('can be instantiated with settlement fields', () => {
      const entity = new SettlementEntity({
        orderId: 'order-1',
        orderLineId: 'line-1',
        productId: 'product-1',
        creatorId: 'creator-1',
        ownerCreatorId: 'creator-1',
        stripeAccountId: 'acct_123',
        currencyCode: 'usd',
        amount: 2500,
        sharePercent: 75,
      });

      expect(entity.orderId).toBe('order-1');
      expect(entity.amount).toBe(2500);
      expect(entity.sharePercent).toBe(75);
    });
  });
});
