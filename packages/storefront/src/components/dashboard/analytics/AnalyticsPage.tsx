/**
 * Purpose: Compose creator analytics controls, summary cards, charts, and product breakdown in one dashboard page.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/AnalyticsPage.test.tsx
 */
import { useMemo, useState } from 'react';
import { Button, Card } from '@heroui/react';
import type { AnalyticsFetcher } from './use-analytics';
import type { TimeRange } from './analytics-types';
import { ProductBreakdown } from './ProductBreakdown';
import { RevenueChart } from './RevenueChart';
import { SalesChart } from './SalesChart';
import { TimeRangeFilter } from './TimeRangeFilter';
import { formatCurrency, useAnalytics } from './use-analytics';

interface AnalyticsPageProps {
  readonly creatorId: string;
  readonly initialTimeRange?: TimeRange;
  readonly fetcher?: AnalyticsFetcher;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function AnalyticsPage({
  creatorId,
  initialTimeRange = '30d',
  fetcher,
}: AnalyticsPageProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const { data, error, isLoading, refetch } = useAnalytics(creatorId, timeRange, { fetcher });

  const topProductName = useMemo(() => {
    if (!data) {
      return 'None';
    }

    return data.topProducts.find((product) => product.productId === data.summary.topProductId)?.name ?? 'None';
  }, [data]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  }

  if (error) {
    return (
      <Card>
        <Card.Header className="space-y-1">
          <Card.Title>Analytics unavailable</Card.Title>
          <Card.Description>{error.message}</Card.Description>
        </Card.Header>
        <Card.Footer>
          <Button variant="secondary" onPress={refetch}>
            Retry analytics
          </Button>
        </Card.Footer>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <Card.Content>
          <p className="text-sm text-muted-foreground">No analytics data is available for this creator yet.</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">Creator analytics</h2>
          <p className="text-sm text-muted-foreground">
            Monitor revenue, demand, and per-product performance for your storefront.
          </p>
        </div>
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <Card.Header className="space-y-1">
            <Card.Description>Total revenue</Card.Description>
            <Card.Title>{formatCurrency(data.summary.totalRevenue)}</Card.Title>
          </Card.Header>
        </Card>
        <Card>
          <Card.Header className="space-y-1">
            <Card.Description>Total sales</Card.Description>
            <Card.Title>{formatCount(data.summary.totalSales)}</Card.Title>
          </Card.Header>
        </Card>
        <Card>
          <Card.Header className="space-y-1">
            <Card.Description>Total views</Card.Description>
            <Card.Title>{formatCount(data.summary.totalViews)}</Card.Title>
          </Card.Header>
        </Card>
        <Card>
          <Card.Header className="space-y-1">
            <Card.Description>Average order value</Card.Description>
            <Card.Title>{formatCurrency(data.summary.avgOrderValue)}</Card.Title>
          </Card.Header>
        </Card>
        <Card>
          <Card.Header className="space-y-1">
            <Card.Description>Top product</Card.Description>
            <Card.Title>{topProductName}</Card.Title>
          </Card.Header>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RevenueChart points={data.revenue} />
        <SalesChart points={data.sales} />
      </div>

      <ProductBreakdown products={data.topProducts} />
    </div>
  );
}
