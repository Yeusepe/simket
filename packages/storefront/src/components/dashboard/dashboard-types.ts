/**
 * Purpose: Shared creator dashboard UI types for sections, summary stats, activity, and quick actions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 *   - packages/storefront/src/components/dashboard/DashboardHome.test.tsx
 */
export type DashboardSection =
  | 'home'
  | 'products'
  | 'collaborations'
  | 'flows'
  | 'settings';

export interface DashboardStats {
  readonly totalRevenue: number;
  readonly totalSales: number;
  readonly totalViews: number;
  readonly conversionRate: number;
  readonly revenueChange: number;
  readonly salesChange: number;
}

export interface ActivityItem {
  readonly id: string;
  readonly type: 'sale' | 'review' | 'collaboration' | 'product_update';
  readonly title: string;
  readonly description: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, string>;
}

export interface QuickAction {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly href: string;
}
