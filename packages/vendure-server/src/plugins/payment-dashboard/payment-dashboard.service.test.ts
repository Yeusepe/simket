/**
 * Purpose: Tests for PaymentDashboardService — creator revenue reporting logic.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 *   - docs/domain-model.md §Creator Dashboard
 * External references:
 *   - https://api-reference.hyperswitch.io/#tag/Payments
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateRevenueSummary,
  calculatePayoutStatus,
  buildTransactionHistoryEntry,
  filterTransactionsByDateRange,
  type TransactionEntry,
} from './payment-dashboard.service.js';

describe('PaymentDashboardService', () => {
  const sampleTransactions: TransactionEntry[] = [
    {
      transactionId: 'tx-1',
      orderId: 'order-1',
      amountCents: 2000,
      platformFeeCents: 100,
      creatorRevenueCents: 1900,
      currency: 'USD',
      status: 'settled',
      createdAt: '2025-01-15T10:00:00Z',
    },
    {
      transactionId: 'tx-2',
      orderId: 'order-2',
      amountCents: 5000,
      platformFeeCents: 250,
      creatorRevenueCents: 4750,
      currency: 'USD',
      status: 'settled',
      createdAt: '2025-01-20T10:00:00Z',
    },
    {
      transactionId: 'tx-3',
      orderId: 'order-3',
      amountCents: 1000,
      platformFeeCents: 50,
      creatorRevenueCents: 950,
      currency: 'USD',
      status: 'pending',
      createdAt: '2025-02-01T10:00:00Z',
    },
  ];

  describe('aggregateRevenueSummary', () => {
    it('sums all revenue correctly', () => {
      const summary = aggregateRevenueSummary(sampleTransactions);
      expect(summary.totalRevenueCents).toBe(8000);
      expect(summary.totalPlatformFeeCents).toBe(400);
      expect(summary.totalCreatorRevenueCents).toBe(7600);
      expect(summary.transactionCount).toBe(3);
    });

    it('separates settled vs pending', () => {
      const summary = aggregateRevenueSummary(sampleTransactions);
      expect(summary.settledRevenueCents).toBe(6650);
      expect(summary.pendingRevenueCents).toBe(950);
    });

    it('handles empty transactions', () => {
      const summary = aggregateRevenueSummary([]);
      expect(summary.totalRevenueCents).toBe(0);
      expect(summary.transactionCount).toBe(0);
    });
  });

  describe('calculatePayoutStatus', () => {
    it('returns "available" for settled transactions', () => {
      expect(calculatePayoutStatus('settled')).toBe('available');
    });

    it('returns "pending" for processing transactions', () => {
      expect(calculatePayoutStatus('pending')).toBe('pending');
    });

    it('returns "failed" for failed transactions', () => {
      expect(calculatePayoutStatus('failed')).toBe('failed');
    });

    it('returns "refunded" for refunded transactions', () => {
      expect(calculatePayoutStatus('refunded')).toBe('refunded');
    });
  });

  describe('buildTransactionHistoryEntry', () => {
    it('builds entry from order data', () => {
      const entry = buildTransactionHistoryEntry({
        transactionId: 'tx-99',
        orderId: 'order-99',
        grossAmountCents: 3000,
        platformFeeCents: 150,
        currency: 'USD',
        status: 'settled',
        timestamp: '2025-03-01T12:00:00Z',
      });
      expect(entry.creatorRevenueCents).toBe(2850);
      expect(entry.transactionId).toBe('tx-99');
    });
  });

  describe('filterTransactionsByDateRange', () => {
    it('filters by start date', () => {
      const filtered = filterTransactionsByDateRange(
        sampleTransactions,
        '2025-01-18T00:00:00Z',
      );
      expect(filtered).toHaveLength(2);
    });

    it('filters by end date', () => {
      const filtered = filterTransactionsByDateRange(
        sampleTransactions,
        undefined,
        '2025-01-31T23:59:59Z',
      );
      expect(filtered).toHaveLength(2);
    });

    it('filters by both', () => {
      const filtered = filterTransactionsByDateRange(
        sampleTransactions,
        '2025-01-18T00:00:00Z',
        '2025-01-31T23:59:59Z',
      );
      expect(filtered).toHaveLength(1);
    });

    it('returns all when no range specified', () => {
      const filtered = filterTransactionsByDateRange(sampleTransactions);
      expect(filtered).toHaveLength(3);
    });
  });
});
