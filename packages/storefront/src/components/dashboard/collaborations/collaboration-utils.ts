/**
 * Purpose: Shared collaboration dashboard formatting and invariant helpers.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§2.4 collaboration settlement admin queries)
 *   - docs/domain-model.md (§4.4 Collaboration, §4.4.1 Settlement)
 * External references:
 *   - https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/ActiveCollaborationCard.test.tsx
 *   - packages/storefront/src/components/dashboard/collaborations/CollaborationEarnings.test.tsx
 */
import type {
  CollaborationParticipant,
  CollaborationSettlementSummary,
  InvitationViewStatus,
  SettlementViewStatus,
} from './collab-types';

export function formatCurrency(cents: number, currencyCode = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(date));
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)}%`;
}

export function getParticipantInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function getSplitTotal(
  ownerSplitPercent: number,
  participants: readonly { splitPercent: number }[],
): number {
  return ownerSplitPercent + participants.reduce((total, participant) => total + participant.splitPercent, 0);
}

export function getInvitationStatusColor(
  status: InvitationViewStatus,
): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'accepted':
      return 'success';
    case 'declined':
    case 'revoked':
      return 'danger';
    case 'expired':
      return 'default';
    case 'pending':
    default:
      return 'warning';
  }
}

export function getSettlementStatusColor(
  status: SettlementViewStatus,
): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'pending':
    case 'processing':
      return 'warning';
    default:
      return 'default';
  }
}

export function summarizeSettlementState(
  summary: CollaborationSettlementSummary,
): { label: string; color: 'default' | 'success' | 'warning' | 'danger' } {
  if (summary.failedCents > 0) {
    return { label: 'Action needed', color: 'danger' };
  }

  if (summary.pendingCents > 0 || summary.processingCents > 0) {
    return { label: 'Settling', color: 'warning' };
  }

  return { label: 'Settled', color: 'success' };
}

export function sortParticipantsByRole(
  participants: readonly CollaborationParticipant[],
): CollaborationParticipant[] {
  return [...participants].sort((left, right) => {
    if (left.role === right.role) {
      return left.name.localeCompare(right.name);
    }

    return left.role === 'owner' ? -1 : 1;
  });
}
