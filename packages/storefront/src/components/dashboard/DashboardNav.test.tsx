/**
 * Purpose: Regression tests for creator dashboard navigation.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardNav.test.tsx
 */
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardNav } from './DashboardNav';

describe('DashboardNav', () => {
  it('renders all dashboard sections', () => {
    render(
      <DashboardNav currentSection="home" onNavigate={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Products' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collaborations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Flows' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('marks the active section', () => {
    render(
      <DashboardNav currentSection="products" onNavigate={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Products' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('calls onNavigate when a section is pressed', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <DashboardNav currentSection="home" onNavigate={onNavigate} />,
    );

    await user.click(screen.getByRole('button', { name: 'Settings' }));

    expect(onNavigate).toHaveBeenCalledWith('settings');
  });
});
