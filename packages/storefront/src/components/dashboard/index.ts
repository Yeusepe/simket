/**
 * Purpose: Export surface for creator dashboard UI components.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/DashboardLayout.test.tsx
 */
export { DashboardHeader } from './DashboardHeader';
export { DashboardHome } from './DashboardHome';
export { DashboardLayout } from './DashboardLayout';
export { DashboardNav } from './DashboardNav';
export { DashboardStats } from './DashboardStats';
export { QuickActions } from './QuickActions';
export { RecentActivity } from './RecentActivity';
export {
  DashboardPreferencesProvider,
  useDashboardPreferences,
  DEFAULT_DASHBOARD_PREFERENCES,
} from './dashboard-preferences';
export * from './analytics';
export * from './licenses';
export * from './products';
export * from './templates';
export type {
  ActivityItem,
  DashboardSection,
  DashboardStats as DashboardStatsData,
  QuickAction,
} from './dashboard-types';
export type {
  DashboardDensity,
  DashboardPreviewDevice,
  DashboardPreviewMode,
  DashboardPreferences,
  DashboardShellStyle,
} from './dashboard-preferences';
