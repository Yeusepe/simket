/**
 * Purpose: Map storefront notifications to UI labels, destinations, and display metadata.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
 * Tests:
 *   - packages/storefront/src/components/notifications/NotificationBell.test.tsx
 *   - packages/storefront/src/pages/NotificationsPage.test.tsx
 */
import type { AppNotification, NotificationType } from '../../types/notifications';

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  purchase: 'Purchases',
  collaboration_invite: 'Collaboration invites',
  collaboration_accepted: 'Collaboration accepted',
  product_update: 'Product updates',
  price_drop: 'Price drops',
  system: 'System',
  gift_received: 'Gifts',
  review: 'Reviews',
  settlement: 'Settlements',
};

const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  purchase: '🛒',
  collaboration_invite: '🤝',
  collaboration_accepted: '✅',
  product_update: '📦',
  price_drop: '💸',
  system: '🔔',
  gift_received: '🎁',
  review: '⭐',
  settlement: '💰',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function getNotificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABELS[type];
}

export function getNotificationIcon(type: NotificationType): string {
  return NOTIFICATION_TYPE_ICONS[type];
}

export function resolveNotificationHref(notification: AppNotification): string {
  const data = isRecord(notification.data) ? notification.data : {};

  return (
    pickString(data, 'href')
    ?? (() => {
      const productSlug = pickString(data, 'productSlug');
      return productSlug ? `/product/${productSlug}` : null;
    })()
    ?? (notification.type === 'purchase' || notification.type === 'gift_received' ? '/library' : null)
    ?? (notification.type === 'collaboration_invite' || notification.type === 'collaboration_accepted' || notification.type === 'settlement'
      ? '/dashboard/collaborations'
      : null)
    ?? '/notifications'
  );
}

export function formatNotificationTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatUnreadCount(count: number): string {
  if (count > 99) {
    return '99+';
  }

  return String(count);
}
