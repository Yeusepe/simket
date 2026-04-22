/**
 * Purpose: Regression tests for the creator dashboard home overview.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardHome.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardHome } from './DashboardHome';

describe('DashboardHome', () => {
  it('renders welcome copy, stats, activity, and quick actions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-01T12:00:00.000Z'));

    render(
      <DashboardHome
        creatorName="Alex Creator"
        stats={{
          totalRevenue: 999900,
          totalSales: 144,
          totalViews: 5400,
          conversionRate: 2.7,
          revenueChange: 11.2,
          salesChange: 6.4,
        }}
        activityItems={[
          {
            id: 'sale-1',
            type: 'sale',
            title: 'Bundle sold',
            description: 'Your bundle was purchased.',
            timestamp: '2025-02-01T11:30:00.000Z',
          },
        ]}
        quickActions={[
          { id: 'new-product', label: 'New Product', icon: 'plus', href: '/dashboard/products/new' },
          { id: 'analytics', label: 'View Analytics', icon: 'chart', href: '/dashboard/analytics' },
        ]}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Welcome back, Alex Creator' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('$9,999.00')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent Activity' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Product' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View templates' })).toBeInTheDocument();

    vi.useRealTimers();
  });
});
