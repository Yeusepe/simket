/**
 * Purpose: Regression tests for the creator issued-license list filters, table, and row actions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/table
 *   - https://www.heroui.com/docs/react/components/modal
 * Tests:
 *   - packages/storefront/src/components/dashboard/licenses/LicenseListPage.test.tsx
 */
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LicenseListPage } from './LicenseListPage';
import type { LicensePolicy, LicenseRecord } from './license-types';

const POLICIES: readonly LicensePolicy[] = [
  {
    id: 'policy-single-user',
    name: 'Single User',
    description: 'One seat perpetual license',
    scheme: 'per-seat',
    maxMachines: 2,
    maxUses: 25,
    durationDays: 365,
    attachedProductIds: ['product-brush-pack'],
    createdAt: '2025-02-01T10:00:00.000Z',
    updatedAt: '2025-02-01T10:00:00.000Z',
  },
  {
    id: 'policy-team',
    name: 'Team',
    description: 'Shared floating license',
    scheme: 'floating',
    maxMachines: 10,
    maxUses: 100,
    durationDays: 30,
    attachedProductIds: ['product-shader-pack'],
    createdAt: '2025-02-01T10:00:00.000Z',
    updatedAt: '2025-02-01T10:00:00.000Z',
  },
];

const LICENSES: readonly LicenseRecord[] = [
  {
    id: 'license-1',
    key: 'ABCD-EFGH-IJKL-MNOP',
    customerName: 'Alex Buyer',
    customerEmail: 'alex@example.com',
    productId: 'product-brush-pack',
    productName: 'Brush Pack',
    policyId: 'policy-single-user',
    status: 'active',
    createdAt: '2025-02-10T12:00:00.000Z',
    expiresAt: '2026-02-10T12:00:00.000Z',
    machineActivations: [],
    validationHistory: [],
  },
  {
    id: 'license-2',
    key: 'WXYZ-1234-5678-QRST',
    customerName: 'Taylor Studio',
    customerEmail: 'taylor@example.com',
    productId: 'product-shader-pack',
    productName: 'Shader Pack',
    policyId: 'policy-team',
    status: 'suspended',
    createdAt: '2025-02-12T12:00:00.000Z',
    expiresAt: '2025-03-12T12:00:00.000Z',
    machineActivations: [],
    validationHistory: [],
  },
];

describe('LicenseListPage', () => {
  it('filters licenses by status, product, and policy', async () => {
    const user = userEvent.setup();

    render(
      <LicenseListPage
        licenses={LICENSES}
        policies={POLICIES}
        onSuspend={vi.fn()}
        onReinstate={vi.fn()}
        onRevoke={vi.fn()}
        onExtend={vi.fn()}
      />,
    );

    expect(screen.getByText('••••-••••-••••-MNOP')).toBeInTheDocument();
    expect(screen.getByText('••••-••••-••••-QRST')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suspended' }));
    expect(screen.queryByText('••••-••••-••••-MNOP')).not.toBeInTheDocument();
    expect(screen.getByText('••••-••••-••••-QRST')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Shader Pack' }));
    expect(screen.getByText('Taylor Studio')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Team' }));
    expect(screen.getByText('Taylor Studio')).toBeInTheDocument();
  });

  it('runs row actions and opens the detail modal', async () => {
    const user = userEvent.setup();
    const onSuspend = vi.fn();

    render(
      <LicenseListPage
        licenses={LICENSES}
        policies={POLICIES}
        onSuspend={onSuspend}
        onReinstate={vi.fn()}
        onRevoke={vi.fn()}
        onExtend={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Suspend Alex Buyer license' }));
    expect(onSuspend).toHaveBeenCalledWith('license-1');

    await user.click(screen.getByRole('button', { name: 'View Taylor Studio license details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Taylor Studio license details' });
    expect(within(dialog).getByText('Taylor Studio')).toBeInTheDocument();
    expect(screen.getByText('WXYZ-1234-5678-QRST')).toBeInTheDocument();
  });
});
