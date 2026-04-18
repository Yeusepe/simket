/**
 * Purpose: Verify invite collaborator form validation and submission wiring.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 Collaboration plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/form
 *   - https://www.heroui.com/docs/react/components/text-field
 *   - https://www.heroui.com/docs/react/components/slider
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/InviteCollaborator.test.tsx
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InviteCollaborator } from './InviteCollaborator';
import type { UseCollaborationsResult } from './collab-types';

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

describe('InviteCollaborator', () => {
  it('validates the invitee email before submitting', async () => {
    const inviteCollaborator = vi.fn();

    render(
      <InviteCollaborator
        productId="product-1"
        useCollaborationsHook={() =>
          createResult({
            inviteCollaborator,
          })
        }
      />,
    );

    fireEvent.change(screen.getByLabelText('Collaborator email'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.submit(screen.getByTestId('invite-collaborator-form'));

    expect(await screen.findByText('Enter a valid collaborator email address.')).toBeInTheDocument();
    expect(inviteCollaborator).not.toHaveBeenCalled();
  });

  it('validates the split percentage before submitting', async () => {
    const inviteCollaborator = vi.fn();

    render(
      <InviteCollaborator
        productId="product-1"
        initialSplitPercent={0}
        useCollaborationsHook={() =>
          createResult({
            inviteCollaborator,
          })
        }
      />,
    );

    fireEvent.change(screen.getByLabelText('Collaborator email'), {
      target: { value: 'artist@example.com' },
    });
    fireEvent.submit(screen.getByTestId('invite-collaborator-form'));

    expect(await screen.findByText('Split percentage must be between 1 and 100.')).toBeInTheDocument();
    expect(inviteCollaborator).not.toHaveBeenCalled();
  });
});
