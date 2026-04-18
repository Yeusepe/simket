/**
 * Purpose: Render pending incoming or outgoing collaboration invitations with response actions.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §1.7 Svix)
 *   - docs/domain-model.md (§4.4.1 CollaborationInvitation)
 * External references:
 *   - https://heroui.com/docs/react/components/button.mdx
 *   - https://heroui.com/docs/react/components/card.mdx
 *   - https://heroui.com/docs/react/components/chip.mdx
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/PendingInvitationCard.test.tsx
 */
import { Button, Card, Chip } from '@heroui/react';
import type { DashboardInvitation } from './collab-types';
import {
  formatDate,
  formatPercent,
  getInvitationStatusColor,
} from './collaboration-utils';

interface PendingInvitationCardProps {
  readonly invitation: DashboardInvitation;
  readonly onAccept?: (invitationId: string) => void;
  readonly onDecline?: (invitationId: string) => void;
}

export function PendingInvitationCard({
  invitation,
  onAccept,
  onDecline,
}: PendingInvitationCardProps) {
  const isIncoming = invitation.direction === 'incoming';

  return (
    <Card className="h-full">
      <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Card.Title>{invitation.productName}</Card.Title>
          <Card.Description>
            {isIncoming
              ? `${invitation.inviterName} invited you to join this release.`
              : `Waiting for ${invitation.inviteeLabel} to respond.`}
          </Card.Description>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip color={getInvitationStatusColor(invitation.status)} variant="soft">
            <Chip.Label>
              {isIncoming ? 'Incoming invitation' : 'Outgoing invitation'}
            </Chip.Label>
          </Chip>
        </div>
      </Card.Header>
      <Card.Content className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-default-200 p-4">
            <p className="text-sm text-default-500">Requested</p>
            <p className="mt-2 font-medium">{formatDate(invitation.requestedAt)}</p>
          </div>
          <div className="rounded-2xl border border-default-200 p-4">
            <p className="text-sm text-default-500">Expires</p>
            <p className="mt-2 font-medium">{formatDate(invitation.expiresAt)}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-default-500">
            Proposed split
          </p>
          <ul className="space-y-2">
            {invitation.proposedSplits.map((participant) => (
              <li
                key={participant.id}
                className="flex items-center justify-between rounded-2xl border border-default-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{participant.name}</p>
                  <p className="text-sm text-default-500 capitalize">{participant.role}</p>
                </div>
                <p className="font-medium">{formatPercent(participant.splitPercent)}</p>
              </li>
            ))}
          </ul>
        </div>
      </Card.Content>
      <Card.Footer className="flex flex-wrap justify-end gap-3">
        {isIncoming ? (
          <>
            <Button variant="outline" onPress={() => onDecline?.(invitation.id)}>
              Decline invitation
            </Button>
            <Button onPress={() => onAccept?.(invitation.id)}>Accept invitation</Button>
          </>
        ) : (
          <Button variant="outline" onPress={() => onDecline?.(invitation.id)}>
            Withdraw invitation
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
}
