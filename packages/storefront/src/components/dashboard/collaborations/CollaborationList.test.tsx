/**
 * Purpose: Verify collaboration list rendering for active collaborations and pending invitations.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 Collaboration plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §1.7 Svix)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/CollaborationList.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CollaborationList } from './CollaborationList';
import type { CollaborationSummary, InvitationSummary, UseCollaborationsResult } from './collab-types';

function createResult(overrides: Partial<UseCollaborationsResult> = {}): UseCollaborationsResult {
  return {
    collaborations: [],
    invitations: [],
    invitation: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
    async loadProduct() {},
    async loadInvitation() {},
    async inviteCollaborator() {},
    async acceptInvitation() {},
    async declineInvitation() {},
    ...overrides,
  };
}

describe('CollaborationList', () => {
  it('renders active collaborations and pending invitations for the product', () => {
    const collaborations: CollaborationSummary[] = [
      {
        id: 'collab-1',
        collaboratorName: 'Alex Rivers',
        collaboratorEmail: 'alex@example.com',
        splitPercent: 35,
        status: 'active',
      },
    ];
    const invitations: InvitationSummary[] = [
      {
        id: 'invite-1',
        productId: 'product-1',
        productName: 'Terrain Kit',
        inviteeEmail: 'pending@example.com',
        splitPercent: 20,
        status: 'pending',
        expiresAt: '2025-01-08T00:00:00.000Z',
        token: 'token-1',
      },
    ];

    render(
      <CollaborationList
        productId="product-1"
        useCollaborationsHook={() =>
          createResult({
            collaborations,
            invitations,
          })
        }
      />,
    );

    expect(screen.getByText('Active collaborations')).toBeInTheDocument();
    expect(screen.getByText('Alex Rivers')).toBeInTheDocument();
    expect(screen.getByText('35% split')).toBeInTheDocument();
    expect(screen.getByText('Pending invitations')).toBeInTheDocument();
    expect(screen.getByText('pending@example.com')).toBeInTheDocument();
    expect(screen.getByText('Invited · 20%')).toBeInTheDocument();
  });
});
