/**
 * Purpose: Regression tests for the creator license policy editor form.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/form
 *   - https://www.heroui.com/docs/react/components/checkbox-group
 * Tests:
 *   - packages/storefront/src/components/dashboard/licenses/LicensePolicyForm.test.tsx
 */
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LicensePolicyForm } from './LicensePolicyForm';

const PRODUCTS = [
  { id: 'product-brush-pack', name: 'Brush Pack' },
  { id: 'product-shader-pack', name: 'Shader Pack' },
] as const;

describe('LicensePolicyForm', () => {
  it('submits policy data with attached products', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<LicensePolicyForm availableProducts={PRODUCTS} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Policy name'), 'Enterprise');
    await user.type(screen.getByLabelText('Description'), 'Enterprise-wide access');
    await user.click(screen.getByRole('button', { name: 'Floating' }));
    await user.clear(screen.getByLabelText('Max machines'));
    await user.type(screen.getByLabelText('Max machines'), '50');
    await user.clear(screen.getByLabelText('Max uses'));
    await user.type(screen.getByLabelText('Max uses'), '500');
    await user.clear(screen.getByLabelText('Expiration duration (days)'));
    await user.type(screen.getByLabelText('Expiration duration (days)'), '365');
    await user.click(screen.getByRole('checkbox', { name: 'Brush Pack' }));
    await user.click(screen.getByRole('checkbox', { name: 'Shader Pack' }));
    await user.click(screen.getByRole('button', { name: 'Save policy' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Enterprise',
        description: 'Enterprise-wide access',
        scheme: 'floating',
        maxMachines: 50,
        maxUses: 500,
        durationDays: 365,
        attachedProductIds: ['product-brush-pack', 'product-shader-pack'],
      });
    });
  });

  it('shows validation errors for incomplete submissions', async () => {
    const user = userEvent.setup();

    render(<LicensePolicyForm availableProducts={PRODUCTS} onSubmit={vi.fn()} />);

    await user.clear(screen.getByLabelText('Policy name'));
    await user.clear(screen.getByLabelText('Max machines'));
    await user.type(screen.getByLabelText('Max machines'), '0');
    await user.click(screen.getByRole('button', { name: 'Save policy' }));

    expect(await screen.findByText('Policy name is required.')).toBeInTheDocument();
    expect(screen.getByText('Attach the policy to at least one product.')).toBeInTheDocument();
  });
});
