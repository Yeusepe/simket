/**
 * Purpose: Route-level container for the creator dashboard overview page.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardHome.test.tsx
 */
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardHome } from '../../components/dashboard';
import { fetchCreatorDashboardData } from '../../services/catalog-api';

export function DashboardHomePage() {
  const navigate = useNavigate();
  const dashboardQuery = useQuery({
    queryKey: ['creator-dashboard'],
    queryFn: fetchCreatorDashboardData,
  });

  if (!dashboardQuery.data) {
    return (
      <div className="rounded-2xl border border-border/70 bg-surface-secondary p-6 text-sm text-muted-foreground">
        {dashboardQuery.error instanceof Error ? dashboardQuery.error.message : 'Loading dashboard…'}
      </div>
    );
  }

  return (
    <DashboardHome
      creatorName={dashboardQuery.data.creatorName}
      stats={dashboardQuery.data.stats}
      activityItems={dashboardQuery.data.activityItems}
      quickActions={dashboardQuery.data.quickActions}
      onNavigate={(href) => navigate(href)}
    />
  );
}
