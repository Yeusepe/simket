/**
 * Purpose: Revenue settlement and collaboration split calculation.
 *
 * Computes per-collaborator payouts after platform fees, with floor rounding
 * so the product owner receives the remainder (no overpay).
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 *   - docs/domain-model.md §Collaboration
 * External references:
 *   - https://api-reference.hyperswitch.io/v1/payouts/payouts--create
 *   - https://docs.hyperswitch.io/features/payment-flows/payouts
 * Tests:
 *   - packages/vendure-server/src/plugins/settlement/settlement.service.test.ts
 */

/** A collaborator's share in a product. */
export interface CollaboratorShare {
  readonly collaboratorId: string;
  /** Percentage of (revenue - platform fee) this collaborator receives. */
  readonly sharePercent: number;
  /** Hyperswitch payout account ID for this collaborator. */
  readonly payoutAccountId: string;
}

/** Result of split calculation for a single collaborator. */
export interface PayoutTarget {
  readonly collaboratorId: string;
  readonly payoutAccountId: string;
  readonly amountCents: number;
}

/** Full settlement breakdown. */
export interface SettlementResult {
  readonly totalRevenueCents: number;
  readonly platformFeeCents: number;
  readonly distributableCents: number;
  readonly collaboratorPayouts: readonly PayoutTarget[];
  readonly ownerRemainderCents: number;
}

export interface SplitValidation {
  readonly valid: boolean;
  readonly errors: string[];
}

export class SettlementError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SettlementError';
  }
}

/**
 * Calculate collaborator revenue splits.
 *
 * @param totalRevenueCents - Gross payment amount (before platform fee)
 * @param collaborators - Collaborator share configs (sum ≤ 100%)
 * @param platformFeeCents - Platform fee already calculated
 * @returns Settlement breakdown with per-collaborator payouts
 */
export function calculateCollaboratorSplits(
  totalRevenueCents: number,
  collaborators: readonly CollaboratorShare[],
  platformFeeCents: number,
): SettlementResult {
  const distributableCents = totalRevenueCents - platformFeeCents;

  const payouts: PayoutTarget[] = collaborators.map((collab) => ({
    collaboratorId: collab.collaboratorId,
    payoutAccountId: collab.payoutAccountId,
    amountCents: Math.floor(distributableCents * (collab.sharePercent / 100)),
  }));

  const totalPaid = payouts.reduce((sum, p) => sum + p.amountCents, 0);
  const ownerRemainderCents = distributableCents - totalPaid;

  return {
    totalRevenueCents,
    platformFeeCents,
    distributableCents,
    collaboratorPayouts: payouts,
    ownerRemainderCents,
  };
}

/**
 * Validate a collaboration split configuration.
 *
 * Rules:
 * - Sum of shares ≤ 100%
 * - Each share: 0 < percent ≤ 100
 * - Each collaborator has a payout account
 * - No duplicate collaborator IDs
 */
export function validateSplitConfiguration(
  collaborators: readonly CollaboratorShare[],
): SplitValidation {
  const errors: string[] = [];

  const seenIds = new Set<string>();
  let totalPercent = 0;

  for (const collab of collaborators) {
    if (collab.sharePercent <= 0 || collab.sharePercent > 100) {
      errors.push(
        `Collaborator ${collab.collaboratorId}: share must be between 0 and 100 (got ${collab.sharePercent})`,
      );
    }
    if (!collab.payoutAccountId) {
      errors.push(`Collaborator ${collab.collaboratorId}: missing payout account`);
    }
    if (seenIds.has(collab.collaboratorId)) {
      errors.push(`Duplicate collaborator ID: ${collab.collaboratorId}`);
    }
    seenIds.add(collab.collaboratorId);
    totalPercent += collab.sharePercent;
  }

  if (totalPercent > 100) {
    errors.push(`Total share percent ${totalPercent}% exceeds 100%`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build Hyperswitch payout params for a collaborator.
 *
 * Docs: https://api-reference.hyperswitch.io/v1/payouts/payouts--create
 */
export function buildPayoutParams(
  target: PayoutTarget,
  currency: string,
  orderId: string,
): {
  amount: number;
  currency: string;
  payoutAccountId: string;
  metadata: Record<string, string>;
} {
  return {
    amount: target.amountCents,
    currency,
    payoutAccountId: target.payoutAccountId,
    metadata: {
      orderId,
      collaboratorId: target.collaboratorId,
      type: 'collaboration_settlement',
    },
  };
}
