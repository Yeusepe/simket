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

export function DashboardHomePage() {
  const navigate = useNavigate();

  return (
    <DashboardHome
      creatorName="Alex Creator"
      stats={{
        totalRevenue: 1287450,
        totalSales: 324,
        totalViews: 18420,
        conversionRate: 4.1,
        revenueChange: 12.8,
        salesChange: 6.3,
      }}
      activityItems={[
        {
          id: 'sale-1',
          type: 'sale',
          title: 'New bundle sale',
          description: 'Starter Creator Bundle was purchased.',
          timestamp: '2025-02-01T11:00:00.000Z',
        },
        {
          id: 'review-1',
          type: 'review',
          title: 'Fresh review posted',
          description: 'A buyer left feedback on Modular Shader Pack.',
          timestamp: '2025-02-01T09:30:00.000Z',
        },
        {
          id: 'collaboration-1',
          type: 'collaboration',
          title: 'Collaboration accepted',
          description: 'Mika joined your upcoming environment pack release.',
          timestamp: '2025-01-31T18:15:00.000Z',
        },
      ]}
      quickActions={[
        {
          id: 'new-product',
          label: 'New Product',
          icon: 'plus',
          href: '/dashboard/products',
        },
        {
          id: 'view-analytics',
          label: 'View Analytics',
          icon: 'chart',
          href: '/dashboard',
        },
        {
          id: 'manage-collaborations',
          label: 'Manage Collaborations',
          icon: 'collaboration',
          href: '/dashboard/collaborations',
        },
        {
          id: 'manage-templates',
          label: 'Manage Templates',
          icon: 'edit',
          href: '/dashboard/templates',
        },
        {
          id: 'edit-store',
          label: 'Edit Store',
          icon: 'edit',
          href: '/dashboard/settings',
        },
      ]}
      onNavigate={(href) => navigate(href)}
    />
  );
}
