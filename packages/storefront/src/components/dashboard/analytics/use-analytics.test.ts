/**
 * Purpose: Regression tests for creator analytics data loading and pure helper utilities.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 * External references:
 *   - https://react.dev/reference/react/useEffect
 *   - https://testing-library.com/docs/react-testing-library/api/#renderhook
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/use-analytics.test.ts
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsData } from './analytics-types';
import {
  aggregateTimeSeries,
  calculateSummary,
  formatCurrency,
  formatPercentage,
  getDateRangeForTimeRange,
  useAnalytics,
  type AnalyticsFetcher,
} from './use-analytics';

function createAnalyticsData(overrides: Partial<AnalyticsData> = {}): AnalyticsData {
  return {
    timeRange: '30d',
    revenue: [
      { date: '2025-03-01', value: 15000 },
      { date: '2025-03-02', value: 12000 },
    ],
    sales: [
      { date: '2025-03-01', value: 3 },
      { date: '2025-03-02', value: 2 },
    ],
    views: [
      { date: '2025-03-01', value: 120 },
      { date: '2025-03-02', value: 100 },
    ],
    topProducts: [
      {
        productId: 'prod-1',
        name: 'Brush Pack',
        revenue: 18000,
        sales: 4,
        views: 150,
        conversionRate: 2.7,
      },
      {
        productId: 'prod-2',
        name: 'Shader Pack',
        revenue: 9000,
        sales: 1,
        views: 70,
        conversionRate: 1.4,
      },
    ],
    summary: {
      totalRevenue: 27000,
      totalSales: 5,
      totalViews: 220,
      avgOrderValue: 5400,
      topProductId: 'prod-1',
    },
    ...overrides,
  };
}

describe('analytics helper utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-04-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aggregates time series by day, week, and month', () => {
    const points = [
      { date: '2025-03-03', value: 100 },
      { date: '2025-03-04', value: 25 },
      { date: '2025-03-10', value: 50 },
      { date: '2025-03-21', value: 75 },
      { date: '2025-04-01', value: 80 },
    ];

    expect(aggregateTimeSeries(points, 'day')).toEqual(points);
    expect(aggregateTimeSeries(points, 'week')).toEqual([
      { date: '2025-03-03', value: 125 },
      { date: '2025-03-10', value: 50 },
      { date: '2025-03-17', value: 75 },
      { date: '2025-03-31', value: 80 },
    ]);
    expect(aggregateTimeSeries(points, 'month')).toEqual([
      { date: '2025-03-01', value: 250 },
      { date: '2025-04-01', value: 80 },
    ]);
  });

  it('calculates the analytics summary from time series data', () => {
    expect(
      calculateSummary(
        createAnalyticsData({
          summary: {
            totalRevenue: 0,
            totalSales: 0,
            totalViews: 0,
            avgOrderValue: 0,
            topProductId: '',
          },
        }),
      ),
    ).toEqual({
      totalRevenue: 27000,
      totalSales: 5,
      totalViews: 220,
      avgOrderValue: 5400,
      topProductId: 'prod-1',
    });
  });

  it('formats currency and percentages for display', () => {
    expect(formatCurrency(123456)).toBe('$1,234.56');
    expect(formatPercentage(12.345)).toBe('12.3%');
  });

  it('builds date ranges for each supported time range', () => {
    expect(getDateRangeForTimeRange('7d')).toEqual({
      start: new Date('2025-04-08T12:00:00.000Z'),
      end: new Date('2025-04-15T12:00:00.000Z'),
    });
    expect(getDateRangeForTimeRange('30d')).toEqual({
      start: new Date('2025-03-16T12:00:00.000Z'),
      end: new Date('2025-04-15T12:00:00.000Z'),
    });
    expect(getDateRangeForTimeRange('90d')).toEqual({
      start: new Date('2025-01-15T12:00:00.000Z'),
      end: new Date('2025-04-15T12:00:00.000Z'),
    });
    expect(getDateRangeForTimeRange('1y')).toEqual({
      start: new Date('2024-04-15T12:00:00.000Z'),
      end: new Date('2025-04-15T12:00:00.000Z'),
    });
    expect(getDateRangeForTimeRange('all')).toEqual({
      start: new Date('1970-01-01T00:00:00.000Z'),
      end: new Date('2025-04-15T12:00:00.000Z'),
    });
  });
});

describe('useAnalytics', () => {
  it('loads analytics data for the selected creator and range', async () => {
    const fetcher: AnalyticsFetcher = vi.fn(async (request) =>
      createAnalyticsData({ timeRange: request.timeRange }),
    );

    const { result } = renderHook(() => useAnalytics('creator-1', '30d', { fetcher }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetcher).toHaveBeenCalledWith({
      creatorId: 'creator-1',
      timeRange: '30d',
      signal: expect.any(AbortSignal),
    });
    expect(result.current.data?.summary.totalRevenue).toBe(27000);
    expect(result.current.error).toBeUndefined();
  });

  it('exposes fetch errors and clears data on failure', async () => {
    const fetcher: AnalyticsFetcher = vi.fn(async () => {
      throw new Error('Analytics unavailable');
    });

    const { result } = renderHook(() => useAnalytics('creator-1', '30d', { fetcher }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toBe('Analytics unavailable');
  });

  it('refetches analytics when requested', async () => {
    const fetcher: AnalyticsFetcher = vi
      .fn<AnalyticsFetcher>()
      .mockResolvedValueOnce(createAnalyticsData({ summary: createAnalyticsData().summary }))
      .mockResolvedValueOnce(
        createAnalyticsData({
          summary: {
            totalRevenue: 45000,
            totalSales: 8,
            totalViews: 400,
            avgOrderValue: 5625,
            topProductId: 'prod-2',
          },
        }),
      );

    const { result } = renderHook(() => useAnalytics('creator-1', '30d', { fetcher }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data?.summary.totalRevenue).toBe(45000);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
