/**
 * Purpose: Shared creator analytics contracts for dashboard charts, summaries, and per-product breakdowns.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 * External references:
 *   - https://react.dev/learn/typescript
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/use-analytics.test.ts
 */
export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export interface AnalyticsData {
  readonly timeRange: TimeRange;
  readonly revenue: readonly TimeSeriesPoint[];
  readonly sales: readonly TimeSeriesPoint[];
  readonly views: readonly TimeSeriesPoint[];
  readonly topProducts: readonly ProductAnalytics[];
  readonly summary: AnalyticsSummary;
}

export interface TimeSeriesPoint {
  readonly date: string;
  readonly value: number;
}

export interface ProductAnalytics {
  readonly productId: string;
  readonly name: string;
  readonly revenue: number;
  readonly sales: number;
  readonly views: number;
  readonly conversionRate: number;
}

export interface AnalyticsSummary {
  readonly totalRevenue: number;
  readonly totalSales: number;
  readonly totalViews: number;
  readonly avgOrderValue: number;
  readonly topProductId: string;
}
