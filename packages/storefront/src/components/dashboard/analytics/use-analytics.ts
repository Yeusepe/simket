/**
 * Purpose: Load creator analytics data, validate payloads, and expose shared formatting helpers for dashboard charts.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://react.dev/reference/react/useEffect
 *   - https://developer.mozilla.org/docs/Web/API/Fetch_API
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/use-analytics.test.ts
 */
import { useCallback, useEffect, useState } from 'react';
import type {
  AnalyticsData,
  AnalyticsSummary,
  ProductAnalytics,
  TimeRange,
  TimeSeriesPoint,
} from './analytics-types';

export interface AnalyticsRequest {
  readonly creatorId: string;
  readonly timeRange: TimeRange;
  readonly signal: AbortSignal;
}

export type AnalyticsFetcher = (request: AnalyticsRequest) => Promise<AnalyticsData>;

export interface UseAnalyticsOptions {
  readonly fetcher?: AnalyticsFetcher;
}

export interface UseAnalyticsResult {
  readonly data: AnalyticsData | null;
  readonly isLoading: boolean;
  readonly error?: Error;
  readonly refetch: () => void;
}

type GroupBy = 'day' | 'week' | 'month';

type AnalyticsPayload = Omit<AnalyticsData, 'summary'> & {
  readonly summary?: AnalyticsSummary;
};

const TIME_RANGE_TO_DAYS: Record<Exclude<TimeRange, '1y' | 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTimeRange(value: unknown): value is TimeRange {
  return value === '7d' || value === '30d' || value === '90d' || value === '1y' || value === 'all';
}

function isTimeSeriesPoint(value: unknown): value is TimeSeriesPoint {
  return (
    isRecord(value) &&
    typeof value.date === 'string' &&
    value.date.length > 0 &&
    typeof value.value === 'number' &&
    Number.isFinite(value.value)
  );
}

function isProductAnalytics(value: unknown): value is ProductAnalytics {
  return (
    isRecord(value) &&
    typeof value.productId === 'string' &&
    value.productId.length > 0 &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    typeof value.revenue === 'number' &&
    Number.isFinite(value.revenue) &&
    typeof value.sales === 'number' &&
    Number.isFinite(value.sales) &&
    typeof value.views === 'number' &&
    Number.isFinite(value.views) &&
    typeof value.conversionRate === 'number' &&
    Number.isFinite(value.conversionRate)
  );
}

function isAnalyticsPayload(value: unknown): value is AnalyticsPayload {
  return (
    isRecord(value) &&
    isTimeRange(value.timeRange) &&
    Array.isArray(value.revenue) &&
    value.revenue.every(isTimeSeriesPoint) &&
    Array.isArray(value.sales) &&
    value.sales.every(isTimeSeriesPoint) &&
    Array.isArray(value.views) &&
    value.views.every(isTimeSeriesPoint) &&
    Array.isArray(value.topProducts) &&
    value.topProducts.every(isProductAnalytics)
  );
}

function getBaseUrl(): string {
  const envBaseUrl = import.meta.env.VITE_CREATOR_ANALYTICS_API_URL;
  return typeof envBaseUrl === 'string' && envBaseUrl.length > 0
    ? envBaseUrl
    : window.location.origin;
}

function parseIsoDate(date: string): Date {
  return date.includes('T') ? new Date(date) : new Date(`${date}T00:00:00.000Z`);
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(date: Date): Date {
  const weekStart = new Date(date);
  const day = weekStart.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  weekStart.setUTCDate(weekStart.getUTCDate() + delta);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
}

function getMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function sumTimeSeries(points: readonly TimeSeriesPoint[]): number {
  return points.reduce((total, point) => total + point.value, 0);
}

function normalizeAnalyticsData(payload: AnalyticsPayload): AnalyticsData {
  const normalizedTimeSeries = {
    revenue: aggregateTimeSeries([...payload.revenue], 'day'),
    sales: aggregateTimeSeries([...payload.sales], 'day'),
    views: aggregateTimeSeries([...payload.views], 'day'),
  };

  return {
    ...payload,
    ...normalizedTimeSeries,
    summary: payload.summary ?? calculateSummary({
      ...payload,
      ...normalizedTimeSeries,
      summary: {
        totalRevenue: 0,
        totalSales: 0,
        totalViews: 0,
        avgOrderValue: 0,
        topProductId: '',
      },
    }),
  };
}

async function fetchAnalytics(request: AnalyticsRequest): Promise<AnalyticsData> {
  const url = new URL(`/api/creators/${encodeURIComponent(request.creatorId)}/analytics`, getBaseUrl());
  url.searchParams.set('timeRange', request.timeRange);

  const response = await globalThis.fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: request.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load creator analytics: ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  if (!isAnalyticsPayload(payload)) {
    throw new Error('Invalid creator analytics response.');
  }

  return normalizeAnalyticsData(payload);
}

export function aggregateTimeSeries(
  points: readonly TimeSeriesPoint[],
  groupBy: GroupBy,
): TimeSeriesPoint[] {
  const totals = new Map<string, number>();

  for (const point of points) {
    const date = parseIsoDate(point.date);
    const groupDate =
      groupBy === 'day'
        ? formatIsoDate(date)
        : groupBy === 'week'
          ? formatIsoDate(getWeekStart(date))
          : formatIsoDate(getMonthStart(date));
    totals.set(groupDate, (totals.get(groupDate) ?? 0) + point.value);
  }

  return [...totals.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, value]) => ({ date, value }));
}

export function calculateSummary(data: AnalyticsData): AnalyticsSummary {
  const totalRevenue = sumTimeSeries(data.revenue);
  const totalSales = sumTimeSeries(data.sales);
  const totalViews = sumTimeSeries(data.views);
  const topProduct = [...data.topProducts].sort((left, right) => right.revenue - left.revenue)[0];

  return {
    totalRevenue,
    totalSales,
    totalViews,
    avgOrderValue: totalSales === 0 ? 0 : Math.round(totalRevenue / totalSales),
    topProductId: topProduct?.productId ?? '',
  };
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPercentage(value: number): string {
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function getDateRangeForTimeRange(range: TimeRange): { start: Date; end: Date } {
  const end = new Date(Date.now());

  if (range === 'all') {
    return {
      start: new Date('1970-01-01T00:00:00.000Z'),
      end,
    };
  }

  const start = new Date(end);
  if (range === '1y') {
    start.setUTCFullYear(start.getUTCFullYear() - 1);
  } else {
    start.setUTCDate(start.getUTCDate() - TIME_RANGE_TO_DAYS[range]);
  }

  return { start, end };
}

export function useAnalytics(
  creatorId: string,
  timeRange: TimeRange,
  options: UseAnalyticsOptions = {},
): UseAnalyticsResult {
  const fetcher = options.fetcher ?? fetchAnalytics;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (creatorId.trim().length === 0) {
      setData(null);
      setIsLoading(false);
      setError(new Error('Creator analytics requires a non-empty creatorId.'));
      return;
    }

    const abortController = new AbortController();

    setIsLoading(true);
    setError(undefined);

    void fetcher({
      creatorId,
      timeRange,
      signal: abortController.signal,
    })
      .then((nextData) => {
        setData(normalizeAnalyticsData(nextData));
        setIsLoading(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') {
          return;
        }

        setData(null);
        setIsLoading(false);
        setError(reason instanceof Error ? reason : new Error('Failed to load creator analytics.'));
      });

    return () => {
      abortController.abort();
    };
  }, [creatorId, fetcher, requestVersion, timeRange]);

  const refetch = useCallback(() => {
    setRequestVersion((current) => current + 1);
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
