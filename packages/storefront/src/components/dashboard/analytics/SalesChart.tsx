/**
 * Purpose: Sales count bar chart for the creator analytics dashboard.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://recharts.github.io/
 *   - https://recharts.github.io/en-US/guide/installation/
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/AnalyticsPage.test.tsx
 */
import { Card } from '@heroui/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TimeSeriesPoint } from './analytics-types';

interface SalesChartProps {
  readonly points: readonly TimeSeriesPoint[];
}

interface ChartDatum {
  readonly date: string;
  readonly label: string;
  readonly value: number;
}

function formatChartDateLabel(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function mapChartData(points: readonly TimeSeriesPoint[]): readonly ChartDatum[] {
  return points.map((point) => ({
    date: point.date,
    label: formatChartDateLabel(point.date),
    value: point.value,
  }));
}

export function SalesChart({ points }: SalesChartProps) {
  const data = mapChartData(points);

  return (
    <Card className="h-full">
      <Card.Header className="space-y-1">
        <Card.Title>Sales over time</Card.Title>
        <Card.Description>Compare daily order volume across the selected range.</Card.Description>
      </Card.Header>
      <Card.Content>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales data for this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <BarChart
              accessibilityLayer
              role="img"
              aria-label="Sales over time chart"
              width={720}
              height={280}
              data={data}
              margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" minTickGap={24} />
              <YAxis allowDecimals={false} width={48} />
              <Tooltip
                formatter={(value) => new Intl.NumberFormat('en-US').format(Number(value ?? 0))}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
