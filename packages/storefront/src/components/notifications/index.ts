/**
 * Purpose: Barrel export for storefront notification UI components.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * Tests:
 *   - packages/storefront/src/components/notifications/NotificationBell.test.tsx
 */
export { NotificationBell } from './NotificationBell';
export {
  formatNotificationTimestamp,
  formatUnreadCount,
  getNotificationIcon,
  getNotificationTypeLabel,
  resolveNotificationHref,
} from './notification-utils';
