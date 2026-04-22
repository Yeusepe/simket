/**
 * Purpose: Summary stat cards for creator revenue, sales, views, and conversion performance.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere)
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardStats.test.tsx
 */
import { KPI } from '@heroui-pro/react';
import type { DashboardStats as DashboardStatsData } from './dashboard-types';
import { Icon } from '../common/Icon';
import type { IconName } from '../common/Icon';

interface DashboardStatsProps {
  readonly stats: DashboardStatsData;
}

interface StatCardDefinition {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly value: number;
  readonly valueStyle: 'currency' | 'decimal' | 'percent';
  readonly change: number;
  readonly changeLabel: string;
  readonly status: 'danger' | 'success' | 'warning';
  readonly chartData: readonly Record<string, number>[];
}

function formatChange(change: number): string {
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format(change)}%`;
}

function getTrend(change: number): 'down' | 'neutral' | 'up' {
  if (change > 0) {
    return 'up';
  }

  if (change < 0) {
    return 'down';
  }

  return 'neutral';
}

function buildSparkline(change: number): readonly Record<string, number>[] {
  const baseline = 48;
  const amplitude = Math.max(4, Math.min(Math.abs(change) * 1.8, 18));
  const direction = change >= 0 ? 1 : -1;

  return [
    { value: baseline - direction * (amplitude * 0.3) },
    { value: baseline + direction * (amplitude * 0.1) },
    { value: baseline + direction * (amplitude * 0.45) },
    { value: baseline + direction * amplitude },
  ];
}

function buildStatCards(stats: DashboardStatsData): readonly StatCardDefinition[] {
  return [
    {
      id: 'revenue',
      label: 'Total Revenue',
      icon: 'revenue',
      value: stats.totalRevenue / 100,
      valueStyle: 'currency',
      change: stats.revenueChange,
      changeLabel: 'Revenue',
      status: stats.revenueChange >= 0 ? 'success' : 'danger',
      chartData: buildSparkline(stats.revenueChange),
    },
    {
      id: 'sales',
      label: 'Total Sales',
      icon: 'sales',
      value: stats.totalSales,
      valueStyle: 'decimal',
      change: stats.salesChange,
      changeLabel: 'Sales',
      status: stats.salesChange >= 0 ? 'success' : 'warning',
      chartData: buildSparkline(stats.salesChange),
    },
    {
      id: 'views',
      label: 'Total Views',
      icon: 'views',
      value: stats.totalViews,
      valueStyle: 'decimal',
      change: stats.salesChange,
      changeLabel: 'Views',
      status: 'warning',
      chartData: buildSparkline(stats.salesChange),
    },
    {
      id: 'conversion',
      label: 'Conversion Rate',
      icon: 'conversion',
      value: stats.conversionRate / 100,
      valueStyle: 'percent',
      change: stats.revenueChange,
      changeLabel: 'Conversion',
      status: stats.revenueChange >= 0 ? 'success' : 'danger',
      chartData: buildSparkline(stats.revenueChange),
    },
  ];
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const cards = buildStatCards(stats);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card) => (
        <KPI key={card.id} className="rounded-[28px] border border-border/70 bg-surface/95">
          <KPI.Header className="items-start justify-between gap-4">
            <div className="space-y-1">
              <KPI.Title>{card.label}</KPI.Title>
              <KPI.Value
                value={card.value}
                style={card.valueStyle}
                currency={card.valueStyle === 'currency' ? 'USD' : undefined}
                minimumFractionDigits={card.valueStyle === 'currency' ? 2 : card.valueStyle === 'percent' ? 1 : 0}
                maximumFractionDigits={card.valueStyle === 'currency' ? 2 : card.valueStyle === 'percent' ? 1 : 2}
              />
            </div>
            <KPI.Icon status={card.status}>
              <Icon name={card.icon} size={20} />
            </KPI.Icon>
          </KPI.Header>
          <KPI.Content className="space-y-3">
            <KPI.Chart data={card.chartData as Record<string, number>[]} height={72} />
          </KPI.Content>
          <KPI.Footer className="flex items-center justify-between gap-3">
            <KPI.Trend
              trend={getTrend(card.change)}
              aria-label={`${card.changeLabel} changed by ${formatChange(card.change)}`}
            >
              {formatChange(card.change)}
            </KPI.Trend>
            <span className="text-xs text-muted-foreground">30-day pulse</span>
          </KPI.Footer>
        </KPI>
      ))}
    </div>
  );
}
