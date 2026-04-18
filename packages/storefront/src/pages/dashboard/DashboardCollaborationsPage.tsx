/**
 * Purpose: Route-level creator dashboard page for collaboration management and settlement visibility.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§2.4 collaboration settlement admin queries)
 *   - docs/domain-model.md (§4.4 Collaboration, §4.4.1 CollaborationInvitation, §4.4.1 Settlement)
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/pages/dashboard/DashboardCollaborationsPage.test.tsx
 */
import { useState } from 'react';
import {
  CollaborationsPage,
  type CreateCollaborationInput,
  type DashboardCollaboration,
  type DashboardInvitation,
  type CollaborationProductOption,
} from '../../components/dashboard/collaborations';

const AVAILABLE_PRODUCTS: readonly CollaborationProductOption[] = [
  {
    id: 'product-1',
    name: 'Nebula Materials Library',
    priceCents: 3900,
    currencyCode: 'USD',
    status: 'published',
    updatedAt: '2025-03-08T00:00:00.000Z',
  },
  {
    id: 'product-2',
    name: 'Atmospheric SFX Toolkit',
    priceCents: 2900,
    currencyCode: 'USD',
    status: 'published',
    updatedAt: '2025-03-05T00:00:00.000Z',
  },
  {
    id: 'product-3',
    name: 'Stylized Forest Pack',
    priceCents: 5400,
    currencyCode: 'USD',
    status: 'draft',
    updatedAt: '2025-03-11T00:00:00.000Z',
  },
];

const INITIAL_ACTIVE_COLLABORATIONS: readonly DashboardCollaboration[] = [
  {
    id: 'collab-nebula',
    productId: 'product-1',
    productName: 'Nebula Materials Library',
    startedAt: '2025-03-01T00:00:00.000Z',
    collaborationStatus: 'active',
    totalEarningsCents: 148230,
    participants: [
      { id: 'owner', name: 'Alex Creator', handle: '@alex-creator', role: 'owner', splitPercent: 55, earningsCents: 81526 },
      { id: 'maya', name: 'Maya Light', handle: '@maya-light', role: 'collaborator', splitPercent: 25, earningsCents: 37057 },
      { id: 'jules', name: 'Jules Shader', handle: '@shaderfox', role: 'collaborator', splitPercent: 20, earningsCents: 29647 },
    ],
    earningsHistory: [
      { period: 'Mar 1', earnedCents: 42000, pendingCents: 2000 },
      { period: 'Mar 8', earnedCents: 56300, pendingCents: 900 },
      { period: 'Mar 15', earnedCents: 49930, pendingCents: 300 },
    ],
    settlementSummary: {
      pendingCents: 3200,
      processingCents: 0,
      completedCents: 145030,
      failedCents: 0,
    },
    settlementHistory: [
      { id: 'settle-1', label: 'Launch week payout', amountCents: 42000, status: 'completed', createdAt: '2025-03-02T00:00:00.000Z' },
      { id: 'settle-2', label: 'Weekly payout', amountCents: 56300, status: 'completed', createdAt: '2025-03-09T00:00:00.000Z' },
      { id: 'settle-3', label: 'Pending March close', amountCents: 3200, status: 'pending', createdAt: '2025-03-15T00:00:00.000Z' },
    ],
  },
  {
    id: 'collab-sfx',
    productId: 'product-2',
    productName: 'Atmospheric SFX Toolkit',
    startedAt: '2025-02-14T00:00:00.000Z',
    collaborationStatus: 'active',
    totalEarningsCents: 87340,
    participants: [
      { id: 'owner', name: 'Alex Creator', handle: '@alex-creator', role: 'owner', splitPercent: 70, earningsCents: 61138 },
      { id: 'nova', name: 'Nova Echo', handle: '@novaecho', role: 'collaborator', splitPercent: 30, earningsCents: 26202 },
    ],
    earningsHistory: [
      { period: 'Feb 17', earnedCents: 24000, pendingCents: 0 },
      { period: 'Feb 24', earnedCents: 28340, pendingCents: 0 },
      { period: 'Mar 3', earnedCents: 35000, pendingCents: 0 },
    ],
    settlementSummary: {
      pendingCents: 0,
      processingCents: 0,
      completedCents: 87340,
      failedCents: 0,
    },
    settlementHistory: [
      { id: 'settle-4', label: 'February close', amountCents: 52340, status: 'completed', createdAt: '2025-02-28T00:00:00.000Z' },
      { id: 'settle-5', label: 'March week one', amountCents: 35000, status: 'completed', createdAt: '2025-03-07T00:00:00.000Z' },
    ],
  },
];

const INITIAL_COMPLETED_COLLABORATIONS: readonly DashboardCollaboration[] = [
  {
    id: 'collab-retro',
    productId: 'product-4',
    productName: 'Retro HUD Kit',
    startedAt: '2024-12-01T00:00:00.000Z',
    completedAt: '2025-02-22T00:00:00.000Z',
    collaborationStatus: 'completed',
    totalEarningsCents: 63210,
    participants: [
      { id: 'owner', name: 'Alex Creator', handle: '@alex-creator', role: 'owner', splitPercent: 50, earningsCents: 31605 },
      { id: 'inez', name: 'Inez Pixel', handle: '@inezpixel', role: 'collaborator', splitPercent: 50, earningsCents: 31605 },
    ],
    earningsHistory: [
      { period: 'Dec', earnedCents: 28000, pendingCents: 0 },
      { period: 'Jan', earnedCents: 18910, pendingCents: 0 },
      { period: 'Feb', earnedCents: 16300, pendingCents: 0 },
    ],
    settlementSummary: {
      pendingCents: 0,
      processingCents: 0,
      completedCents: 63210,
      failedCents: 0,
    },
    settlementHistory: [
      { id: 'settle-6', label: 'Final settlement', amountCents: 16300, status: 'completed', createdAt: '2025-02-22T00:00:00.000Z' },
    ],
  },
];

const INITIAL_PENDING_INVITATIONS: readonly DashboardInvitation[] = [
  {
    id: 'invite-stylized-forest',
    direction: 'incoming',
    inviterName: 'Nora Fields',
    inviteeLabel: '@alex-creator',
    productId: 'product-3',
    productName: 'Stylized Forest Pack',
    status: 'pending',
    requestedAt: '2025-03-10T00:00:00.000Z',
    expiresAt: '2025-03-18T00:00:00.000Z',
    proposedSplits: [
      { id: 'nora', name: 'Nora Fields', handle: '@norafields', role: 'owner', splitPercent: 60, earningsCents: 0 },
      { id: 'alex', name: 'Alex Creator', handle: '@alex-creator', role: 'collaborator', splitPercent: 40, earningsCents: 0 },
    ],
  },
  {
    id: 'invite-portrait-pack',
    direction: 'outgoing',
    inviterName: 'Alex Creator',
    inviteeLabel: 'maya@example.com',
    productId: 'product-1',
    productName: 'Nebula Materials Library',
    status: 'pending',
    requestedAt: '2025-03-12T00:00:00.000Z',
    expiresAt: '2025-03-20T00:00:00.000Z',
    proposedSplits: [
      { id: 'alex', name: 'Alex Creator', handle: '@alex-creator', role: 'owner', splitPercent: 70, earningsCents: 0 },
      { id: 'maya', name: 'Maya Light', handle: '@maya-light', role: 'collaborator', splitPercent: 30, earningsCents: 0 },
    ],
  },
];

export function DashboardCollaborationsPage() {
  const [activeCollaborations, setActiveCollaborations] = useState<readonly DashboardCollaboration[]>(
    INITIAL_ACTIVE_COLLABORATIONS,
  );
  const [pendingInvitations, setPendingInvitations] = useState<readonly DashboardInvitation[]>(
    INITIAL_PENDING_INVITATIONS,
  );
  const [completedCollaborations] = useState<readonly DashboardCollaboration[]>(
    INITIAL_COMPLETED_COLLABORATIONS,
  );

  const handleCreateCollaboration = async (input: CreateCollaborationInput) => {
    const product = AVAILABLE_PRODUCTS.find((item) => item.id === input.productId);
    if (!product) {
      throw new Error(`Unable to create collaboration for unknown product "${input.productId}".`);
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 7);

    setPendingInvitations((current) => [
      {
        id: `invite-${product.id}-${current.length + 1}`,
        direction: 'outgoing',
        inviterName: 'Alex Creator',
        inviteeLabel: input.collaborators.map((collaborator) => collaborator.identifier).join(', '),
        productId: product.id,
        productName: product.name,
        status: 'pending',
        requestedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        proposedSplits: [
          {
            id: 'owner',
            name: 'Alex Creator',
            handle: '@alex-creator',
            role: 'owner',
            splitPercent: input.ownerSplitPercent,
            earningsCents: 0,
          },
          ...input.collaborators.map((collaborator, index) => ({
            id: `collaborator-${index + 1}`,
            name: collaborator.identifier.replace(/^@/, ''),
            handle: collaborator.identifier.startsWith('@') ? collaborator.identifier : undefined,
            email: collaborator.identifier.includes('@') && !collaborator.identifier.startsWith('@')
              ? collaborator.identifier
              : undefined,
            role: 'collaborator' as const,
            splitPercent: collaborator.splitPercent,
            earningsCents: 0,
          })),
        ],
      },
      ...current,
    ]);
  };

  const handleAcceptInvitation = (invitationId: string) => {
    const invitation = pendingInvitations.find((item) => item.id === invitationId);
    if (!invitation || invitation.direction !== 'incoming') {
      return;
    }

    setActiveCollaborations((current) => [
      {
        id: `collab-${invitation.productId}`,
        productId: invitation.productId,
        productName: invitation.productName,
        startedAt: new Date().toISOString(),
        collaborationStatus: 'active',
        totalEarningsCents: 0,
        participants: invitation.proposedSplits,
        earningsHistory: [],
        settlementSummary: {
          pendingCents: 0,
          processingCents: 0,
          completedCents: 0,
          failedCents: 0,
        },
        settlementHistory: [],
      },
      ...current,
    ]);
    setPendingInvitations((current) => current.filter((item) => item.id !== invitationId));
  };

  const handleDeclineInvitation = (invitationId: string) => {
    setPendingInvitations((current) => current.filter((item) => item.id !== invitationId));
  };

  return (
    <CollaborationsPage
      activeCollaborations={activeCollaborations}
      availableProducts={AVAILABLE_PRODUCTS}
      completedCollaborations={completedCollaborations}
      currentCreatorName="Alex Creator"
      onAcceptInvitation={handleAcceptInvitation}
      onCreateCollaboration={handleCreateCollaboration}
      onDeclineInvitation={handleDeclineInvitation}
      pendingInvitations={pendingInvitations}
    />
  );
}
