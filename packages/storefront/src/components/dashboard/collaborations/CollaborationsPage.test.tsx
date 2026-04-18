/**
 * Purpose: Verify the collaborations dashboard tabs, detail modal, and create flow entrypoint.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2.4 collaboration settlement admin queries)
 *   - docs/domain-model.md (§4.4 Collaboration, §4.4.1 Settlement)
 * External references:
 *   - https://heroui.com/docs/react/components/tabs.mdx
 *   - https://heroui.com/docs/react/components/modal.mdx
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/CollaborationsPage.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CollaborationsPage } from './CollaborationsPage';
import type {
  CollaborationProductOption,
  DashboardCollaboration,
  DashboardInvitation,
} from './collab-types';

const ACTIVE_COLLABORATIONS: readonly DashboardCollaboration[] = [
  {
    id: 'collab-1',
    collaborationStatus: 'active',
    productId: 'product-1',
    productName: 'Nebula Materials Library',
    startedAt: '2025-03-01T00:00:00.000Z',
    totalEarningsCents: 148230,
    participants: [
      { id: 'owner', name: 'Alex Creator', role: 'owner', splitPercent: 55, earningsCents: 81526 },
      { id: 'maya', name: 'Maya Light', role: 'collaborator', splitPercent: 25, earningsCents: 37057 },
      { id: 'jules', name: 'Jules Shader', role: 'collaborator', splitPercent: 20, earningsCents: 29647 },
    ],
    earningsHistory: [
      { period: 'Mar 1', earnedCents: 42000, pendingCents: 2000 },
      { period: 'Mar 8', earnedCents: 56000, pendingCents: 1200 },
    ],
    settlementSummary: {
      pendingCents: 3200,
      processingCents: 0,
      completedCents: 145030,
      failedCents: 0,
    },
    settlementHistory: [
      {
        id: 'settlement-1',
        amountCents: 42000,
        createdAt: '2025-03-01T00:00:00.000Z',
        label: 'Launch week payout',
        status: 'completed',
      },
    ],
  },
];

const COMPLETED_COLLABORATIONS: readonly DashboardCollaboration[] = [
  {
    ...ACTIVE_COLLABORATIONS[0]!,
    id: 'collab-2',
    collaborationStatus: 'completed',
    productId: 'product-2',
    productName: 'Retro HUD Kit',
    completedAt: '2025-02-22T00:00:00.000Z',
  },
];

const PENDING_INVITATIONS: readonly DashboardInvitation[] = [
  {
    id: 'invite-1',
    direction: 'incoming',
    expiresAt: '2025-03-18T00:00:00.000Z',
    inviterName: 'Nora Fields',
    inviteeLabel: '@alex-creator',
    productId: 'product-3',
    productName: 'Stylized Forest Pack',
    requestedAt: '2025-03-10T00:00:00.000Z',
    status: 'pending',
    proposedSplits: [
      { id: 'owner', name: 'Nora Fields', role: 'owner', splitPercent: 60, earningsCents: 0 },
      { id: 'invitee', name: 'Alex Creator', role: 'collaborator', splitPercent: 40, earningsCents: 0 },
    ],
  },
];

const PRODUCTS: readonly CollaborationProductOption[] = [
  {
    id: 'product-1',
    name: 'Nebula Materials Library',
    currencyCode: 'USD',
    priceCents: 3900,
    status: 'published',
    updatedAt: '2025-03-08T00:00:00.000Z',
  },
];

describe('CollaborationsPage', () => {
  it('switches tabs and opens collaboration details', async () => {
    const user = userEvent.setup();

    render(
      <CollaborationsPage
        activeCollaborations={ACTIVE_COLLABORATIONS}
        availableProducts={PRODUCTS}
        completedCollaborations={COMPLETED_COLLABORATIONS}
        currentCreatorName="Alex Creator"
        pendingInvitations={PENDING_INVITATIONS}
      />,
    );

    expect(screen.getByText('Nebula Materials Library')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Pending Invitations (1)' }));
    expect(screen.getByText('Stylized Forest Pack')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Completed (1)' }));
    expect(screen.getByText('Retro HUD Kit')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Active (1)' }));
    await user.click(screen.getByRole('button', { name: 'View collaboration details' }));

    expect(await screen.findByRole('dialog', { name: 'Nebula Materials Library collaboration details' })).toBeInTheDocument();
    expect(screen.getByText('Launch week payout')).toBeInTheDocument();
  });

  it('opens the create collaboration modal and passes submissions through', async () => {
    const user = userEvent.setup();
    const onCreateCollaboration = vi.fn();

    render(
      <CollaborationsPage
        activeCollaborations={ACTIVE_COLLABORATIONS}
        availableProducts={PRODUCTS}
        completedCollaborations={COMPLETED_COLLABORATIONS}
        currentCreatorName="Alex Creator"
        onCreateCollaboration={onCreateCollaboration}
        pendingInvitations={PENDING_INVITATIONS}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Create collaboration' }));
    expect(await screen.findByRole('dialog', { name: 'Create collaboration' })).toBeInTheDocument();
  });
});
