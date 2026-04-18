/**
 * Purpose: Export creator analytics dashboard components, hook, and shared contracts.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/AnalyticsPage.test.tsx
 */
export { AnalyticsPage } from './AnalyticsPage';
export { ProductBreakdown } from './ProductBreakdown';
export { RevenueChart } from './RevenueChart';
export { SalesChart } from './SalesChart';
export { TimeRangeFilter } from './TimeRangeFilter';
export {
  aggregateTimeSeries,
  calculateSummary,
  formatCurrency,
  formatPercentage,
  getDateRangeForTimeRange,
  useAnalytics,
} from './use-analytics';
export type {
  AnalyticsData,
  AnalyticsSummary,
  ProductAnalytics,
  TimeRange,
  TimeSeriesPoint,
} from './analytics-types';
