/**
 * Purpose: Regression tests for creator dashboard summary stats cards.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardStats.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardStats } from './DashboardStats';

describe('DashboardStats', () => {
  it('renders four stat cards and formats values', () => {
    render(
      <DashboardStats
        stats={{
          totalRevenue: 1234567,
          totalSales: 482,
          totalViews: 23145,
          conversionRate: 3.8,
          revenueChange: 12.4,
          salesChange: -2.1,
        }}
      />,
    );

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    expect(screen.getByText('Total Views')).toBeInTheDocument();
    expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    expect(screen.getByText('$12,345.67')).toBeInTheDocument();
    expect(screen.getByText('482')).toBeInTheDocument();
    expect(screen.getByText('23,145')).toBeInTheDocument();
    expect(screen.getByText('3.8%')).toBeInTheDocument();
  });

  it('shows positive and negative change indicators', () => {
    render(
      <DashboardStats
        stats={{
          totalRevenue: 500000,
          totalSales: 25,
          totalViews: 1000,
          conversionRate: 2.5,
          revenueChange: 8.5,
          salesChange: -1.2,
        }}
      />,
    );

    expect(screen.getByLabelText('Revenue changed by +8.5%')).toBeInTheDocument();
    expect(screen.getByLabelText('Sales changed by -1.2%')).toBeInTheDocument();
  });
});
