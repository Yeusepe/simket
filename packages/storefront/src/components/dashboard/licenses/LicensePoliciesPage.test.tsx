/**
 * Purpose: Regression tests for the creator license policy management page.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/dashboard/licenses/LicensePoliciesPage.test.tsx
 */
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LicensePoliciesPage } from './LicensePoliciesPage';
import type { LicensePolicy } from './license-types';

const POLICIES: readonly LicensePolicy[] = [
  {
    id: 'policy-single-user',
    name: 'Single User',
    description: 'One machine seat',
    scheme: 'per-seat',
    maxMachines: 2,
    maxUses: 25,
    durationDays: 365,
    attachedProductIds: ['product-brush-pack'],
    createdAt: '2025-02-01T10:00:00.000Z',
    updatedAt: '2025-02-01T10:00:00.000Z',
  },
];

const PRODUCTS = [
  { id: 'product-brush-pack', name: 'Brush Pack' },
  { id: 'product-shader-pack', name: 'Shader Pack' },
] as const;

describe('LicensePoliciesPage', () => {
  it('renders creator policy cards with attached product counts', () => {
    render(
      <LicensePoliciesPage
        policies={POLICIES}
        availableProducts={PRODUCTS}
        onCreatePolicy={vi.fn()}
        onUpdatePolicy={vi.fn()}
        onDeletePolicy={vi.fn()}
      />,
    );

    expect(screen.getByText('Single User')).toBeInTheDocument();
    expect(screen.getByText('1 product attached')).toBeInTheDocument();
    expect(screen.getByText('365 days')).toBeInTheDocument();
  });

  it('opens the create form and submits a new policy', async () => {
    const user = userEvent.setup();
    const onCreatePolicy = vi.fn().mockResolvedValue(undefined);

    render(
      <LicensePoliciesPage
        policies={POLICIES}
        availableProducts={PRODUCTS}
        onCreatePolicy={onCreatePolicy}
        onUpdatePolicy={vi.fn()}
        onDeletePolicy={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'New policy' }));
    await user.type(screen.getByLabelText('Policy name'), 'Team');
    await user.click(screen.getByRole('checkbox', { name: 'Shader Pack' }));
    await user.click(screen.getByRole('button', { name: 'Save policy' }));

    await waitFor(() => {
      expect(onCreatePolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Team',
          attachedProductIds: ['product-shader-pack'],
        }),
      );
    });
  });
});
