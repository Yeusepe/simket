/**
 * Purpose: Regression tests for the creator dashboard layout shell.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/drawer
 *   - https://www.heroui.com/docs/react/components/breadcrumbs
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardLayout } from './DashboardLayout';
import { DashboardPreferencesProvider } from './dashboard-preferences';

describe('DashboardLayout', () => {
  it('renders navigation, header, and main content', () => {
    render(
      <DashboardPreferencesProvider>
        <DashboardLayout
          currentSection="products"
          onNavigate={vi.fn()}
          onNavigateToHref={vi.fn()}
        >
          <div>Products content</div>
        </DashboardLayout>
      </DashboardPreferencesProvider>,
    );

    expect(screen.getByRole('treegrid', { name: 'Creator dashboard sections' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Products' }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: 'Search dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New product' })).toBeInTheDocument();
    expect(screen.getByText('Creator workspace')).toBeInTheDocument();
    expect(screen.getByText('Products content')).toBeInTheDocument();
  });

  it('renders the template-backed home shell without the section header card', () => {
    render(
      <DashboardPreferencesProvider>
        <DashboardLayout currentSection="home" onNavigate={vi.fn()} onNavigateToHref={vi.fn()}>
          <div>Home content</div>
        </DashboardLayout>
      </DashboardPreferencesProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Creator dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.getByText('Home content')).toBeInTheDocument();
  });
});
