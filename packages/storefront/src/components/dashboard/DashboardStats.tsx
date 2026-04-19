/**
 * Purpose: Summary stat cards for creator revenue, sales, views, and conversion performance.
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
import { Card } from '@heroui/react';
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
  readonly value: string;
  readonly change: number;
  readonly changeLabel: string;
}

function formatCurrencyFromCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatRate(value: number): string {
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatChange(change: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format(change);

  return `${formatted}%`;
}

function getChangeTone(change: number): string {
  return change >= 0 ? 'text-emerald-600' : 'text-rose-600';
}

function getChangeGlyph(change: number): string {
  return change >= 0 ? '↑' : '↓';
}

function buildStatCards(stats: DashboardStatsData): readonly StatCardDefinition[] {
  return [
    {
      id: 'revenue',
      label: 'Total Revenue',
      icon: 'revenue',
      value: formatCurrencyFromCents(stats.totalRevenue),
      change: stats.revenueChange,
      changeLabel: 'Revenue',
    },
    {
      id: 'sales',
      label: 'Total Sales',
      icon: 'sales',
      value: formatCount(stats.totalSales),
      change: stats.salesChange,
      changeLabel: 'Sales',
    },
    {
      id: 'views',
      label: 'Total Views',
      icon: 'views',
      value: formatCount(stats.totalViews),
      change: stats.salesChange,
      changeLabel: 'Views',
    },
    {
      id: 'conversion',
      label: 'Conversion Rate',
      icon: 'conversion',
      value: formatRate(stats.conversionRate),
      change: stats.revenueChange,
      changeLabel: 'Conversion',
    },
  ];
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const cards = buildStatCards(stats);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.id} variant="secondary" className="h-full">
          <Card.Header className="items-start justify-between gap-4">
            <div className="space-y-1">
              <Card.Description>{card.label}</Card.Description>
              <Card.Title>{card.value}</Card.Title>
            </div>
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background"
            >
              <Icon name={card.icon} size={22} />
            </span>
          </Card.Header>
          <Card.Footer className="pt-0">
            <span
              className={`text-sm font-medium ${getChangeTone(card.change)}`}
              aria-label={`${card.changeLabel} changed by ${formatChange(card.change)}`}
            >
              <span aria-hidden="true">{getChangeGlyph(card.change)} </span>
              {formatChange(card.change)}
            </span>
          </Card.Footer>
        </Card>
      ))}
    </div>
  );
}
