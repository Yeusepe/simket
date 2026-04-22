/**
 * Purpose: Creator dashboard overview page that combines summary stats, activity, and quick actions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardHome.test.tsx
 */
import { Card } from '@heroui/react';
import type { ActivityItem, DashboardStats as DashboardStatsData, QuickAction } from './dashboard-types';
import { DashboardStats } from './DashboardStats';
import { DashboardToolbar } from './DashboardToolbar';
import { QuickActions } from './QuickActions';
import { RecentActivity } from './RecentActivity';

interface DashboardHomeProps {
  readonly creatorName: string;
  readonly stats: DashboardStatsData;
  readonly activityItems: readonly ActivityItem[];
  readonly quickActions: readonly QuickAction[];
  readonly onNavigate?: (href: string) => void;
}

export function DashboardHome({
  creatorName,
  stats,
  activityItems,
  quickActions,
  onNavigate,
}: DashboardHomeProps) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 pb-10 pt-4">
      <Card className="overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--simket-accent200)_60%,var(--surface))_0%,var(--surface)_52%,color-mix(in_oklab,var(--simket-neutral100)_75%,var(--surface))_100%)]">
        <Card.Content className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.7fr)] lg:items-end">
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Creator overview
            </p>
            <h2 className="text-3xl font-semibold text-foreground">Welcome back, {creatorName}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Here&apos;s the latest on your storefront performance, live product surfaces, and creator operations.
            </p>
          </section>

          <div className="rounded-[28px] border border-border/70 bg-background/80 p-4">
            <p className="text-sm font-medium text-foreground">30-day momentum</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Revenue is {stats.revenueChange >= 0 ? 'up' : 'down'} {Math.abs(stats.revenueChange).toFixed(1)}% and
              sales are {stats.salesChange >= 0 ? 'up' : 'down'} {Math.abs(stats.salesChange).toFixed(1)}% compared with the previous window.
            </p>
          </div>
        </Card.Content>
      </Card>

      <DashboardToolbar onNavigate={onNavigate} />

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <RecentActivity items={activityItems} />
        <QuickActions actions={quickActions} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
