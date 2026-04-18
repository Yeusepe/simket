/**
 * Purpose: Verify collaboration hook state transitions for loading and inviting collaborators.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 Collaboration plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - packages/storefront/node_modules/@testing-library/react/types/index.d.ts
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/use-collaborations.test.ts
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCollaborations } from './use-collaborations';
import type { CollaborationsApi } from './collab-types';

function createApi(): CollaborationsApi {
  return {
    async listForProduct() {
      return {
        collaborations: [
          {
            id: 'collab-1',
            collaboratorName: 'Alex Rivers',
            collaboratorEmail: 'alex@example.com',
            splitPercent: 40,
            status: 'active',
          },
        ],
        invitations: [],
      };
    },
    async createInvitation(input) {
      return {
        id: 'invite-1',
        productId: input.productId,
        productName: 'Terrain Kit',
        inviteeEmail: input.inviteeEmail,
        splitPercent: input.splitPercent,
        status: 'pending',
        expiresAt: '2025-01-08T00:00:00.000Z',
        token: 'token-1',
      };
    },
    async getInvitationByToken(token) {
      return {
        id: 'invite-1',
        productId: 'product-1',
        productName: 'Terrain Kit',
        inviteeEmail: 'collab@example.com',
        inviterName: 'Owner One',
        splitPercent: 25,
        status: 'pending',
        expiresAt: '2025-01-08T00:00:00.000Z',
        token,
      };
    },
    async acceptInvitation() {
      return {
        id: 'collab-2',
        collaboratorName: 'Collab User',
        collaboratorEmail: 'collab@example.com',
        splitPercent: 25,
        status: 'active',
      };
    },
    async declineInvitation(token) {
      return {
        id: 'invite-1',
        productId: 'product-1',
        productName: 'Terrain Kit',
        inviteeEmail: 'collab@example.com',
        splitPercent: 25,
        status: 'declined',
        expiresAt: '2025-01-08T00:00:00.000Z',
        token,
      };
    },
  };
}

describe('useCollaborations', () => {
  it('loads collaboration data for a product', async () => {
    const api = createApi();
    const { result } = renderHook(() => useCollaborations({ api, autoLoad: false }));

    await act(async () => {
      await result.current.loadProduct('product-1');
    });

    expect(result.current.collaborations).toHaveLength(1);
    expect(result.current.collaborations[0]?.collaboratorName).toBe('Alex Rivers');
  });

  it('adds the created invitation to local state', async () => {
    const api = createApi();
    const { result } = renderHook(() => useCollaborations({ api, autoLoad: false }));

    await act(async () => {
      await result.current.inviteCollaborator({
        productId: 'product-1',
        inviteeEmail: 'new@example.com',
        splitPercent: 20,
      });
    });

    expect(result.current.invitations).toHaveLength(1);
    expect(result.current.invitations[0]?.inviteeEmail).toBe('new@example.com');
  });
});
