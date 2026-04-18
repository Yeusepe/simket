/**
 * Purpose: Verify collaboration invitation response states and actions for email-link landing pages.
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
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InvitationResponse } from './InvitationResponse';
import type { InvitationDetail, UseCollaborationsResult } from './collab-types';

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

function createInvitation(overrides: Partial<InvitationDetail> = {}): InvitationDetail {
  return {
    id: 'invite-1',
    productId: 'product-1',
    productName: 'Terrain Kit',
    inviteeEmail: 'collab@example.com',
    inviterName: 'Owner One',
    splitPercent: 30,
    status: 'pending',
    expiresAt: '2025-01-08T00:00:00.000Z',
    token: 'token-1',
    ...overrides,
  };
}

describe('InvitationResponse', () => {
  it('shows accept and decline actions for a pending invitation', () => {
    const acceptInvitation = vi.fn();
    const declineInvitation = vi.fn();

    render(
      <InvitationResponse
        token="token-1"
        useCollaborationsHook={() =>
          createResult({
            invitation: createInvitation(),
            acceptInvitation,
            declineInvitation,
          })
        }
      />,
    );

    expect(screen.getByText('Terrain Kit')).toBeInTheDocument();
    expect(screen.getByText('30% split')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decline invitation' }));

    expect(acceptInvitation).toHaveBeenCalledWith('token-1');
    expect(declineInvitation).toHaveBeenCalledWith('token-1');
  });

  it('shows the expired state and disables response actions', () => {
    render(
      <InvitationResponse
        token="expired-token"
        useCollaborationsHook={() =>
          createResult({
            invitation: createInvitation({
              token: 'expired-token',
              status: 'expired',
            }),
          })
        }
      />,
    );

    expect(screen.getByText('This invitation has expired.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept invitation' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline invitation' })).toBeDisabled();
  });
});
