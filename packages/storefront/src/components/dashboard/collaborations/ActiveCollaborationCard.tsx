/**
 * Purpose: Summary card for active or completed collaborations in the creator dashboard.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§2.4 collaboration settlement admin queries)
 *   - docs/domain-model.md (§4.4 Collaboration, §4.4.1 Settlement)
 * External references:
 *   - https://heroui.com/docs/react/components/avatar.mdx
 *   - https://heroui.com/docs/react/components/card.mdx
 *   - https://heroui.com/docs/react/components/chip.mdx
 *   - https://heroui.com/docs/react/components/button.mdx
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/ActiveCollaborationCard.test.tsx
 */
import { Avatar, Button, Card, Chip } from '@heroui/react';
import type { DashboardCollaboration } from './collab-types';
import {
  formatCurrency,
  formatDate,
  formatPercent,
  getParticipantInitials,
  sortParticipantsByRole,
  summarizeSettlementState,
} from './collaboration-utils';

interface ActiveCollaborationCardProps {
  readonly collaboration: DashboardCollaboration;
  readonly onOpenDetails?: (collaborationId: string) => void;
}

export function ActiveCollaborationCard({
  collaboration,
  onOpenDetails,
}: ActiveCollaborationCardProps) {
  const settlementState = summarizeSettlementState(collaboration.settlementSummary);
  const participants = sortParticipantsByRole(collaboration.participants);

  return (
    <Card className="h-full">
      <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Card.Title>{collaboration.productName}</Card.Title>
          <Card.Description>
            {collaboration.collaborationStatus === 'completed'
              ? `Completed ${formatDate(collaboration.completedAt ?? collaboration.startedAt)}`
              : `Started ${formatDate(collaboration.startedAt)}`}
          </Card.Description>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip color={settlementState.color} variant="soft">
            <Chip.Label>{settlementState.label}</Chip.Label>
          </Chip>
          <Chip
            color={collaboration.collaborationStatus === 'completed' ? 'default' : 'success'}
            variant="soft"
          >
            <Chip.Label>
              {collaboration.collaborationStatus === 'completed' ? 'Completed' : 'Active'}
            </Chip.Label>
          </Chip>
        </div>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-default-200 p-4">
            <p className="text-sm text-default-500">Lifetime earnings</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(collaboration.totalEarningsCents)}
            </p>
          </div>
          <div className="rounded-2xl border border-default-200 p-4">
            <p className="text-sm text-default-500">Pending settlement</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(collaboration.settlementSummary.pendingCents)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-default-500">
            Collaborators
          </p>
          <ul className="space-y-3">
            {participants.map((participant) => (
              <li
                key={participant.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-default-200 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar aria-label={`${participant.name} avatar`} className="size-10">
                    {participant.avatarUrl ? (
                      <Avatar.Image alt={participant.name} src={participant.avatarUrl} />
                    ) : null}
                    <Avatar.Fallback>{getParticipantInitials(participant.name)}</Avatar.Fallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{participant.name}</p>
                    <p className="text-sm text-default-500">
                      {participant.handle ?? participant.email ?? participant.role}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPercent(participant.splitPercent)}</p>
                  <p className="text-sm text-default-500">
                    {formatCurrency(participant.earningsCents)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card.Content>
      <Card.Footer className="justify-end">
        <Button variant="secondary" onPress={() => onOpenDetails?.(collaboration.id)}>
          View collaboration details
        </Button>
      </Card.Footer>
    </Card>
  );
}
