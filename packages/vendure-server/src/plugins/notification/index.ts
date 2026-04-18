/**
 * Purpose: Barrel export for the NotificationPlugin package.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 * Tests:
 *   - packages/vendure-server/src/plugins/notification/notification.service.test.ts
 *   - packages/vendure-server/src/plugins/notification/notification.resolver.test.ts
 */
export { NotificationPlugin } from './notification.plugin.js';
export {
  NotificationEntity,
  NotificationType,
  NOTIFICATION_TYPES,
  isNotificationType,
} from './notification.entity.js';
export type {
  NotificationPayload,
  NotificationTypeValue,
} from './notification.entity.js';
export { notificationShopApiExtensions } from './notification.api.js';
export { NotificationResolver } from './notification.resolver.js';
export {
  NotificationService,
  decodeNotificationCursor,
  encodeNotificationCursor,
} from './notification.service.js';
export type {
  CreateNotificationInput,
  NotificationCursorPage,
  NotificationListOptions,
} from './notification.service.js';
