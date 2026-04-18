/**
 * Purpose: Regression tests for the creator license detail modal and lifecycle actions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/modal
 * Tests:
 *   - packages/storefront/src/components/dashboard/licenses/LicenseDetailModal.test.tsx
 */
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LicenseDetailModal } from './LicenseDetailModal';
import type { LicensePolicy, LicenseRecord } from './license-types';

const POLICY: LicensePolicy = {
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
};

const LICENSE: LicenseRecord = {
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
  machineActivations: [
    {
      id: 'machine-1',
      name: 'Studio Mac',
      fingerprint: 'mac-studio',
      activatedAt: '2025-02-11T08:00:00.000Z',
      lastValidatedAt: '2025-02-15T12:00:00.000Z',
    },
  ],
  validationHistory: [
    {
      id: 'validation-1',
      status: 'passed',
      detail: 'License validated successfully',
      createdAt: '2025-02-15T12:00:00.000Z',
    },
  ],
};

describe('LicenseDetailModal', () => {
  it('renders full license details and copies the full key', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    render(
      <LicenseDetailModal
        isOpen
        license={LICENSE}
        policy={POLICY}
        onOpenChange={vi.fn()}
        onSuspend={vi.fn()}
        onReinstate={vi.fn()}
        onRevoke={vi.fn()}
        onExtend={vi.fn()}
      />,
    );

    expect(screen.getByText('ABCD-EFGH-IJKL-MNOP')).toBeInTheDocument();
    expect(screen.getByText('Studio Mac')).toBeInTheDocument();
    expect(screen.getByText('License validated successfully')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy license key' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('ABCD-EFGH-IJKL-MNOP');
    });
  });

  it('fires lifecycle action handlers', async () => {
    const user = userEvent.setup();
    const onSuspend = vi.fn();
    const onRevoke = vi.fn();
    const onExtend = vi.fn();

    render(
      <LicenseDetailModal
        isOpen
        license={LICENSE}
        policy={POLICY}
        onOpenChange={vi.fn()}
        onSuspend={onSuspend}
        onReinstate={vi.fn()}
        onRevoke={onRevoke}
        onExtend={onExtend}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Suspend license' }));
    await user.click(screen.getByRole('button', { name: 'Extend by 30 days' }));
    await user.click(screen.getByRole('button', { name: 'Revoke license' }));

    expect(onSuspend).toHaveBeenCalledWith('license-1');
    expect(onExtend).toHaveBeenCalledWith('license-1', 30);
    expect(onRevoke).toHaveBeenCalledWith('license-1');
  });
});
