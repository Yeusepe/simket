/**
 * Purpose: Render the collaboration invitation accept/decline landing state from an email link.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §1.7 Svix)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/InvitationResponse.test.tsx
 */
import { Button, Card } from '@heroui/react';
import { useCollaborations } from './use-collaborations';
import type { InvitationDetail, UseCollaborationsHook } from './collab-types';

export interface InvitationResponseProps {
  readonly token: string;
  readonly useCollaborationsHook?: UseCollaborationsHook;
}

function getStatusMessage(invitation: InvitationDetail): string | null {
  switch (invitation.status) {
    case 'expired':
      return 'This invitation has expired.';
    case 'accepted':
      return 'This invitation has already been accepted.';
    case 'declined':
      return 'This invitation has already been declined.';
    case 'revoked':
      return 'This invitation has been revoked by the inviter.';
    default:
      return null;
  }
}

export function InvitationResponse({
  token,
  useCollaborationsHook = useCollaborations,
}: InvitationResponseProps) {
  const { invitation, isLoading, isSubmitting, error, acceptInvitation, declineInvitation } =
    useCollaborationsHook({
      invitationToken: token,
    });

  if (isLoading && !invitation) {
    return (
      <Card>
        <Card.Content>
          <p>Loading invitation…</p>
        </Card.Content>
      </Card>
    );
  }

  if (!invitation) {
    return (
      <Card>
        <Card.Content className="space-y-2">
          <p className="font-medium">Invitation unavailable.</p>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </Card.Content>
      </Card>
    );
  }

  const statusMessage = getStatusMessage(invitation);
  const actionsDisabled = invitation.status !== 'pending' || isSubmitting;

  return (
    <Card>
      <Card.Header className="space-y-1">
        <Card.Title>{invitation.productName}</Card.Title>
        <Card.Description>
          {invitation.inviterName
            ? `${invitation.inviterName} invited you to collaborate.`
            : 'You have been invited to collaborate on this product.'}
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-4">
        <p className="text-sm text-default-700">{invitation.splitPercent}% split</p>
        {statusMessage ? <p>{statusMessage}</p> : null}
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button
            aria-label="Accept invitation"
            isDisabled={actionsDisabled}
            isPending={isSubmitting}
            onPress={() => void acceptInvitation(invitation.token)}
          >
            Accept invitation
          </Button>
          <Button
            aria-label="Decline invitation"
            variant="outline"
            isDisabled={actionsDisabled}
            onPress={() => void declineInvitation(invitation.token)}
          >
            Decline invitation
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}
