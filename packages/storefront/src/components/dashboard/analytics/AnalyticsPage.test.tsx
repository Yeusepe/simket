/**
 * Purpose: Regression tests for creator analytics page composition and time-range updates.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://react.dev/reference/react/useEffect
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/AnalyticsPage.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsPage } from './AnalyticsPage';
import type { AnalyticsData } from './analytics-types';
import type { AnalyticsFetcher } from './use-analytics';

describe('AnalyticsPage', () => {
  it('renders analytics sections after loading', async () => {
    const fetcher: AnalyticsFetcher = vi.fn(async (): Promise<AnalyticsData> => ({
      timeRange: '30d',
      revenue: [
        { date: '2025-03-01', value: 18000 },
        { date: '2025-03-02', value: 12000 },
      ],
      sales: [
        { date: '2025-03-01', value: 3 },
        { date: '2025-03-02', value: 2 },
      ],
      views: [
        { date: '2025-03-01', value: 200 },
        { date: '2025-03-02', value: 160 },
      ],
      topProducts: [
        {
          productId: 'prod-1',
          name: 'Brush Pack',
          revenue: 30000,
          sales: 5,
          views: 360,
          conversionRate: 1.4,
        },
      ],
      summary: {
        totalRevenue: 30000,
        totalSales: 5,
        totalViews: 360,
        avgOrderValue: 6000,
        topProductId: 'prod-1',
      },
    }));

    render(<AnalyticsPage creatorId="creator-1" fetcher={fetcher} />);

    expect(screen.getByText('Loading analytics…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Revenue over time')).toBeInTheDocument();
    });

    expect(screen.getByText('Sales over time')).toBeInTheDocument();
    expect(screen.getByText('Product performance')).toBeInTheDocument();
    expect(screen.getAllByText('$300.00').length).toBeGreaterThan(0);
  });

  it('refetches analytics when the time range changes', async () => {
    const user = userEvent.setup();
    const fetcher: AnalyticsFetcher = vi
      .fn()
      .mockImplementation(async ({ timeRange }) => ({
        timeRange,
        revenue: [{ date: '2025-03-01', value: timeRange === '90d' ? 45000 : 12000 }],
        sales: [{ date: '2025-03-01', value: timeRange === '90d' ? 9 : 2 }],
        views: [{ date: '2025-03-01', value: timeRange === '90d' ? 900 : 200 }],
        topProducts: [
          {
            productId: 'prod-1',
            name: timeRange === '90d' ? 'Shader Pack' : 'Brush Pack',
            revenue: timeRange === '90d' ? 45000 : 12000,
            sales: timeRange === '90d' ? 9 : 2,
            views: timeRange === '90d' ? 900 : 200,
            conversionRate: timeRange === '90d' ? 4.2 : 1,
          },
        ],
        summary: {
          totalRevenue: timeRange === '90d' ? 45000 : 12000,
          totalSales: timeRange === '90d' ? 9 : 2,
          totalViews: timeRange === '90d' ? 900 : 200,
          avgOrderValue: 5000,
          topProductId: 'prod-1',
        },
      }));

    render(<AnalyticsPage creatorId="creator-1" fetcher={fetcher} />);

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole('button', { name: 'Last 90 days' }));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    expect(screen.getAllByText('Shader Pack').length).toBeGreaterThan(0);
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ creatorId: 'creator-1', timeRange: '90d' }),
    );
  });
});
