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
import { DashboardHome } from '../../components/dashboard';
import {
  MOCK_DASHBOARD_STATS,
  MOCK_ACTIVITY_ITEMS,
  MOCK_QUICK_ACTIONS,
} from '../../mock-data';

export function DashboardHomePage() {
  const navigate = useNavigate();

  return (
    <DashboardHome
      creatorName="Alex Creator"
      stats={MOCK_DASHBOARD_STATS}
      activityItems={MOCK_ACTIVITY_ITEMS}
      quickActions={MOCK_QUICK_ACTIONS}
      onNavigate={(href) => navigate(href)}
    />
  );
}
