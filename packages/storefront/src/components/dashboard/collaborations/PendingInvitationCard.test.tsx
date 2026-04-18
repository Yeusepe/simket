/**
 * Purpose: Verify pending invitation cards render direction-specific actions for collaboration invites.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §1.7 Svix)
 *   - docs/domain-model.md (§4.4.1 CollaborationInvitation)
 * External references:
 *   - https://heroui.com/docs/react/components/card.mdx
 *   - https://heroui.com/docs/react/components/button.mdx
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/PendingInvitationCard.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PendingInvitationCard } from './PendingInvitationCard';
import type { DashboardInvitation } from './collab-types';

function createInvitation(overrides: Partial<DashboardInvitation> = {}): DashboardInvitation {
  return {
    id: 'invite-1',
    direction: 'incoming',
    expiresAt: '2025-03-18T00:00:00.000Z',
    inviterName: 'Nora Fields',
    inviteeLabel: '@alex-creator',
    productId: 'product-1',
    productName: 'Stylized Forest Pack',
    requestedAt: '2025-03-10T00:00:00.000Z',
    status: 'pending',
    proposedSplits: [
      { id: 'owner', name: 'Nora Fields', role: 'owner', splitPercent: 60, earningsCents: 0 },
      { id: 'invitee', name: 'Alex Creator', role: 'collaborator', splitPercent: 40, earningsCents: 0 },
    ],
    ...overrides,
  };
}

describe('PendingInvitationCard', () => {
  it('renders incoming invitation actions and calls the handlers', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    const onDecline = vi.fn();

    render(
      <PendingInvitationCard
        invitation={createInvitation()}
        onAccept={onAccept}
        onDecline={onDecline}
      />,
    );

    expect(screen.getByText('Incoming invitation')).toBeInTheDocument();
    expect(screen.getByText('Stylized Forest Pack')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Accept invitation' }));
    await user.click(screen.getByRole('button', { name: 'Decline invitation' }));

    expect(onAccept).toHaveBeenCalledWith('invite-1');
    expect(onDecline).toHaveBeenCalledWith('invite-1');
  });

  it('shows outgoing invitation copy without accept controls', () => {
    render(
      <PendingInvitationCard
        invitation={createInvitation({
          direction: 'outgoing',
          inviteeLabel: 'maya@example.com',
          inviterName: 'Alex Creator',
        })}
      />,
    );

    expect(screen.getByText('Outgoing invitation')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();
    expect(screen.getByText('Waiting for maya@example.com to respond.')).toBeInTheDocument();
  });
});
