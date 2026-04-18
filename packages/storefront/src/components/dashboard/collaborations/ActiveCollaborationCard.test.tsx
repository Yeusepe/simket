/**
 * Purpose: Verify active collaboration cards render split and earnings details and open detail actions.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2.4 collaboration settlement admin queries)
 *   - docs/domain-model.md (§4.4 Collaboration, §4.4.1 Settlement)
 * External references:
 *   - https://heroui.com/docs/react/components/avatar.mdx
 *   - https://heroui.com/docs/react/components/card.mdx
 *   - https://heroui.com/docs/react/components/chip.mdx
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/ActiveCollaborationCard.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActiveCollaborationCard } from './ActiveCollaborationCard';
import type { DashboardCollaboration } from './collab-types';

function createCollaboration(
  overrides: Partial<DashboardCollaboration> = {},
): DashboardCollaboration {
  return {
    id: 'collab-1',
    collaborationStatus: 'active',
    productId: 'product-1',
    productName: 'Nebula Materials Library',
    startedAt: '2025-03-01T00:00:00.000Z',
    totalEarningsCents: 148230,
    participants: [
      {
        id: 'owner',
        name: 'Alex Creator',
        role: 'owner',
        splitPercent: 55,
        earningsCents: 81526,
      },
      {
        id: 'maya',
        name: 'Maya Light',
        role: 'collaborator',
        splitPercent: 25,
        earningsCents: 37057,
      },
      {
        id: 'jules',
        name: 'Jules Shader',
        role: 'collaborator',
        splitPercent: 20,
        earningsCents: 29647,
      },
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
    ...overrides,
  };
}

describe('ActiveCollaborationCard', () => {
  it('renders collaboration details and opens the detail action', async () => {
    const user = userEvent.setup();
    const onOpenDetails = vi.fn();

    render(
      <ActiveCollaborationCard
        collaboration={createCollaboration()}
        onOpenDetails={onOpenDetails}
      />,
    );

    expect(screen.getByText('Nebula Materials Library')).toBeInTheDocument();
    expect(screen.getByText('$1,482.30')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.getByText('Maya Light')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View collaboration details' }));

    expect(onOpenDetails).toHaveBeenCalledWith('collab-1');
  });
});
