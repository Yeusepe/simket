/**
 * Purpose: Shared storefront notification feed types and API contracts.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/storefront/src/hooks/use-notifications.test.ts
 *   - packages/storefront/src/components/notifications/NotificationBell.test.tsx
 *   - packages/storefront/src/pages/NotificationsPage.test.tsx
 */
export const NOTIFICATION_TYPES = [
  'purchase',
  'collaboration_invite',
  'collaboration_accepted',
  'product_update',
  'price_drop',
  'system',
  'gift_received',
  'review',
  'settlement',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];
export type NotificationTypeFilter = NotificationType | 'all';
export type NotificationData = Record<string, unknown>;

export interface AppNotification {
  readonly id: string;
  readonly recipientId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly data: NotificationData | null;
  readonly read: boolean;
  readonly readAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NotificationConnection {
  readonly items: readonly AppNotification[];
  readonly pageInfo: {
    readonly endCursor: string | null;
    readonly hasNextPage: boolean;
  };
  readonly unreadCount: number;
}

export interface NotificationsListRequest {
  readonly first: number;
  readonly after?: string;
  readonly type?: NotificationType;
  readonly read?: boolean;
}

export interface NotificationsApi {
  listNotifications(request: NotificationsListRequest): Promise<NotificationConnection>;
  markNotificationRead(input: {
    readonly notificationId: string;
    readonly read: boolean;
  }): Promise<AppNotification>;
  markAllNotificationsRead(): Promise<number>;
}

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && NOTIFICATION_TYPES.includes(value as NotificationType);
}
