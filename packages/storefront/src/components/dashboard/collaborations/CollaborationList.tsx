/**
 * Purpose: Show active collaborations and pending invitations for a creator product.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 Collaboration plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/CollaborationList.test.tsx
 */
import { Card } from '@heroui/react';
import { useCollaborations } from './use-collaborations';
import type { UseCollaborationsHook } from './collab-types';

export interface CollaborationListProps {
  readonly productId: string;
  readonly useCollaborationsHook?: UseCollaborationsHook;
}

export function CollaborationList({
  productId,
  useCollaborationsHook = useCollaborations,
}: CollaborationListProps) {
  const { collaborations, invitations, isLoading, error } = useCollaborationsHook({ productId });

  return (
    <Card>
      <Card.Header className="space-y-1">
        <Card.Title>Collaborators</Card.Title>
        <Card.Description>Track accepted revenue shares and invitations waiting on a response.</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-6">
        {isLoading ? <p>Loading collaborations…</p> : null}
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-default-500">
            Active collaborations
          </h3>
          {collaborations.length === 0 ? (
            <p className="text-sm text-default-500">No active collaborators yet.</p>
          ) : (
            <ul className="space-y-3">
              {collaborations.map((collaboration) => (
                <li
                  key={collaboration.id}
                  className="rounded-2xl border border-default-200 px-4 py-3"
                >
                  <p className="font-medium">{collaboration.collaboratorName}</p>
                  {collaboration.collaboratorEmail ? (
                    <p className="text-sm text-default-500">{collaboration.collaboratorEmail}</p>
                  ) : null}
                  <p className="text-sm text-default-700">{collaboration.splitPercent}% split</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-default-500">
            Pending invitations
          </h3>
          {invitations.length === 0 ? (
            <p className="text-sm text-default-500">No pending invitations for this product.</p>
          ) : (
            <ul className="space-y-3">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="rounded-2xl border border-default-200 px-4 py-3">
                  <p className="font-medium">{invitation.inviteeEmail}</p>
                  <p className="text-sm text-default-700">Invited · {invitation.splitPercent}%</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Card.Content>
    </Card>
  );
}
