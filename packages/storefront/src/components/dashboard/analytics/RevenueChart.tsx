/**
 * Purpose: Revenue time-series area chart for the creator analytics dashboard.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://recharts.github.io/
 *   - https://recharts.github.io/en-US/guide/installation/
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/RevenueChart.test.tsx
 */
import { useId } from 'react';
import { Card } from '@heroui/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TimeSeriesPoint } from './analytics-types';
import { formatCurrency } from './use-analytics';

interface RevenueChartProps {
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

function formatCompactCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

function mapChartData(points: readonly TimeSeriesPoint[]): readonly ChartDatum[] {
  return points.map((point) => ({
    date: point.date,
    label: formatChartDateLabel(point.date),
    value: point.value,
  }));
}

export function RevenueChart({ points }: RevenueChartProps) {
  const gradientId = useId();
  const data = mapChartData(points);

  return (
    <Card className="h-full">
      <Card.Header className="space-y-1">
        <Card.Title>Revenue over time</Card.Title>
        <Card.Description>Track gross revenue trends for the selected range.</Card.Description>
      </Card.Header>
      <Card.Content>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No revenue data for this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <AreaChart
              accessibilityLayer
              role="img"
              aria-label="Revenue over time chart"
              width={720}
              height={280}
              data={data}
              margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" minTickGap={24} />
              <YAxis tickFormatter={formatCompactCurrency} width={72} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0ea5e9"
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
