/**
 * Purpose: Regression tests for creator dashboard quick action buttons.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/dashboard/QuickActions.test.tsx
 */
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuickActions } from './QuickActions';

describe('QuickActions', () => {
  it('renders action buttons', () => {
    render(
      <QuickActions
        actions={[
          { id: 'new-product', label: 'New Product', icon: 'plus', href: '/dashboard/products/new' },
          { id: 'analytics', label: 'View Analytics', icon: 'chart', href: '/dashboard/analytics' },
        ]}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'New Product' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Analytics' })).toBeInTheDocument();
  });

  it('calls onNavigate when an action is pressed', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <QuickActions
        actions={[
          { id: 'new-product', label: 'New Product', icon: 'plus', href: '/dashboard/products/new' },
        ]}
        onNavigate={onNavigate}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'New Product' }));

    expect(onNavigate).toHaveBeenCalledWith('/dashboard/products/new');
  });
});
