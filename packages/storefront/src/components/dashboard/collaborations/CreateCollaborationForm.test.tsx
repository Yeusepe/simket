/**
 * Purpose: Verify collaboration creation form validation and submission behavior.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §1.6 Convex functions)
 *   - docs/domain-model.md (§4.4 Collaboration)
 * External references:
 *   - https://heroui.com/docs/react/components/form.mdx
 *   - https://heroui.com/docs/react/components/select.mdx
 *   - https://heroui.com/docs/react/components/text-field.mdx
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/CreateCollaborationForm.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateCollaborationForm } from './CreateCollaborationForm';
import type { CollaborationProductOption } from './collab-types';

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

describe('CreateCollaborationForm', () => {
  it('rejects submissions when the configured split does not total 100%', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <CreateCollaborationForm
        availableProducts={PRODUCTS}
        currentCreatorName="Alex Creator"
        initialProductId="product-1"
        initialOwnerSplitPercent={60}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Collaborator email or username'), 'maya@example.com');
    await user.clear(screen.getByLabelText('Split percentage'));
    await user.type(screen.getByLabelText('Split percentage'), '30');
    await user.click(screen.getByRole('button', { name: 'Create collaboration' }));

    expect(
      await screen.findByText('Collaboration splits must add up to exactly 100%.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits normalized collaboration data once the split totals 100%', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <CreateCollaborationForm
        availableProducts={PRODUCTS}
        currentCreatorName="Alex Creator"
        initialProductId="product-1"
        initialOwnerSplitPercent={55}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Collaborator email or username'), '  @maya-light  ');
    await user.clear(screen.getByLabelText('Split percentage'));
    await user.type(screen.getByLabelText('Split percentage'), '25');

    await user.click(screen.getByRole('button', { name: 'Add collaborator' }));

    const collaboratorInputs = screen.getAllByLabelText('Collaborator email or username');
    const splitInputs = screen.getAllByLabelText('Split percentage');

    await user.type(collaboratorInputs[1]!, 'jules@example.com');
    await user.clear(splitInputs[1]!);
    await user.type(splitInputs[1]!, '20');

    await user.click(screen.getByRole('button', { name: 'Create collaboration' }));

    expect(onSubmit).toHaveBeenCalledWith({
      collaborators: [
        { identifier: '@maya-light', splitPercent: 25 },
        { identifier: 'jules@example.com', splitPercent: 20 },
      ],
      ownerSplitPercent: 55,
      productId: 'product-1',
    });
  });
});
