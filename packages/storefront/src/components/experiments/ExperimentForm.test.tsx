/**
 * Purpose: Verify creator experiment form submission and variant editing.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/form
 *   - https://www.heroui.com/docs/react/components/input
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/experiments/ExperimentForm.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExperimentForm } from './ExperimentForm';

describe('ExperimentForm', () => {
  it('submits a new experiment with multiple variants', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ExperimentForm
        products={[{ id: 'product-1', name: 'Brush Pack' }]}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Experiment name'), 'CTA headline test');
    await user.type(screen.getByLabelText('Experiment description'), 'Compare button copy');
    await user.type(screen.getByLabelText('Variant 1 name'), 'control');
    await user.clear(screen.getByLabelText('Variant 1 weight'));
    await user.type(screen.getByLabelText('Variant 1 weight'), '50');
    await user.type(screen.getByLabelText('Variant 1 CTA text'), 'Add to cart');

    await user.click(screen.getByRole('button', { name: 'Add variant' }));

    await user.type(screen.getByLabelText('Variant 2 name'), 'variant-b');
    await user.clear(screen.getByLabelText('Variant 2 weight'));
    await user.type(screen.getByLabelText('Variant 2 weight'), '50');
    await user.type(screen.getByLabelText('Variant 2 CTA text'), 'Get instant access');

    await user.click(screen.getByRole('button', { name: 'Create experiment' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'CTA headline test',
        description: 'Compare button copy',
        variants: [
          expect.objectContaining({
            name: 'control',
            weight: 50,
            config: expect.objectContaining({ ctaText: 'Add to cart' }),
          }),
          expect.objectContaining({
            name: 'variant-b',
            weight: 50,
            config: expect.objectContaining({ ctaText: 'Get instant access' }),
          }),
        ],
      }),
    );
  });
});
