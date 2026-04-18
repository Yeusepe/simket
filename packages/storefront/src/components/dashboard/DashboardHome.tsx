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
import { DashboardStats } from './DashboardStats';
import { QuickActions } from './QuickActions';
import { RecentActivity } from './RecentActivity';
import type { ActivityItem, DashboardStats as DashboardStatsData, QuickAction } from './dashboard-types';

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
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-3xl font-semibold text-foreground">Welcome back, {creatorName}</h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s the latest on your storefront performance and creator operations.
        </p>
      </section>

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <RecentActivity items={activityItems} />
        <QuickActions actions={quickActions} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
