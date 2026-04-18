/**
 * Purpose: Payment dashboard logic — revenue aggregation, transaction history,
 * and payout status for the creator dashboard.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 *   - docs/domain-model.md §Creator Dashboard
 * External references:
 *   - https://api-reference.hyperswitch.io/#tag/Payments
 * Tests:
 *   - packages/vendure-server/src/plugins/payment-dashboard/payment-dashboard.service.test.ts
 */

export interface TransactionEntry {
  readonly transactionId: string;
  readonly orderId: string;
  readonly amountCents: number;
  readonly platformFeeCents: number;
  readonly creatorRevenueCents: number;
  readonly currency: string;
  readonly status: 'settled' | 'pending' | 'failed' | 'refunded';
  readonly createdAt: string;
}

export interface RevenueSummary {
  readonly totalRevenueCents: number;
  readonly totalPlatformFeeCents: number;
  readonly totalCreatorRevenueCents: number;
  readonly settledRevenueCents: number;
  readonly pendingRevenueCents: number;
  readonly transactionCount: number;
}

export type PayoutStatus = 'available' | 'pending' | 'failed' | 'refunded';

/**
 * Aggregate revenue summary from a list of transactions.
 */
export function aggregateRevenueSummary(
  transactions: readonly TransactionEntry[],
): RevenueSummary {
  let totalRevenueCents = 0;
  let totalPlatformFeeCents = 0;
  let totalCreatorRevenueCents = 0;
  let settledRevenueCents = 0;
  let pendingRevenueCents = 0;

  for (const tx of transactions) {
    totalRevenueCents += tx.amountCents;
    totalPlatformFeeCents += tx.platformFeeCents;
    totalCreatorRevenueCents += tx.creatorRevenueCents;

    if (tx.status === 'settled') {
      settledRevenueCents += tx.creatorRevenueCents;
    } else if (tx.status === 'pending') {
      pendingRevenueCents += tx.creatorRevenueCents;
    }
  }

  return {
    totalRevenueCents,
    totalPlatformFeeCents,
    totalCreatorRevenueCents,
    settledRevenueCents,
    pendingRevenueCents,
    transactionCount: transactions.length,
  };
}

/**
 * Map transaction status to payout availability.
 */
export function calculatePayoutStatus(
  transactionStatus: TransactionEntry['status'],
): PayoutStatus {
  switch (transactionStatus) {
    case 'settled':
      return 'available';
    case 'pending':
      return 'pending';
    case 'failed':
      return 'failed';
    case 'refunded':
      return 'refunded';
  }
}

/**
 * Build a transaction history entry from order data.
 */
export function buildTransactionHistoryEntry(params: {
  transactionId: string;
  orderId: string;
  grossAmountCents: number;
  platformFeeCents: number;
  currency: string;
  status: TransactionEntry['status'];
  timestamp: string;
}): TransactionEntry {
  return {
    transactionId: params.transactionId,
    orderId: params.orderId,
    amountCents: params.grossAmountCents,
    platformFeeCents: params.platformFeeCents,
    creatorRevenueCents: params.grossAmountCents - params.platformFeeCents,
    currency: params.currency,
    status: params.status,
    createdAt: params.timestamp,
  };
}

/**
 * Filter transactions by date range (ISO 8601 strings).
 */
export function filterTransactionsByDateRange(
  transactions: readonly TransactionEntry[],
  startDate?: string,
  endDate?: string,
): TransactionEntry[] {
  return transactions.filter((tx) => {
    const txTime = new Date(tx.createdAt).getTime();
    if (startDate && txTime < new Date(startDate).getTime()) return false;
    if (endDate && txTime > new Date(endDate).getTime()) return false;
    return true;
  });
}
