/**
 * Purpose: Verify notification resolver delegation, recipient scoping, and enum parsing.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/api/common/request-context.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/notification/notification.resolver.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import { NotificationType } from './notification.entity.js';
import { NotificationResolver } from './notification.resolver.js';
import type { NotificationService } from './notification.service.js';

describe('NotificationResolver', () => {
  it('delegates list and unread count queries for the active user', async () => {
    const notificationService = {
      listNotifications: vi.fn().mockResolvedValue({
        items: [],
        pageInfo: { endCursor: null, hasNextPage: false },
        unreadCount: 0,
      }),
      countUnreadNotifications: vi.fn().mockResolvedValue(3),
      setNotificationReadState: vi.fn(),
      setNotificationsReadState: vi.fn(),
      markAllAsRead: vi.fn(),
    } as unknown as NotificationService;
    const resolver = new NotificationResolver(notificationService);
    const ctx = { activeUserId: 'user-1' } as RequestContext;

    await resolver.notifications(ctx, 20, undefined, 'product_update', false);
    await resolver.unreadNotificationsCount(ctx);

    expect((notificationService as { listNotifications: ReturnType<typeof vi.fn> }).listNotifications)
      .toHaveBeenCalledWith(ctx, 'user-1', {
        first: 20,
        after: undefined,
        type: NotificationType.ProductUpdate,
        read: false,
      });
    expect((notificationService as { countUnreadNotifications: ReturnType<typeof vi.fn> }).countUnreadNotifications)
      .toHaveBeenCalledWith(ctx, 'user-1');
  });

  it('delegates read-state mutations for the active user', async () => {
    const notificationService = {
      listNotifications: vi.fn(),
      countUnreadNotifications: vi.fn(),
      setNotificationReadState: vi.fn().mockResolvedValue({ id: 'notification-1' }),
      setNotificationsReadState: vi.fn().mockResolvedValue([{ id: 'notification-1' }]),
      markAllAsRead: vi.fn().mockResolvedValue(7),
    } as unknown as NotificationService;
    const resolver = new NotificationResolver(notificationService);
    const ctx = { activeUserId: 'user-1' } as RequestContext;

    await resolver.markNotificationRead(ctx, 'notification-1', true);
    await resolver.markNotificationsRead(ctx, ['notification-1'], false);
    await resolver.markAllNotificationsRead(ctx);

    expect((notificationService as { setNotificationReadState: ReturnType<typeof vi.fn> }).setNotificationReadState)
      .toHaveBeenCalledWith(ctx, 'user-1', 'notification-1', true);
    expect((notificationService as { setNotificationsReadState: ReturnType<typeof vi.fn> }).setNotificationsReadState)
      .toHaveBeenCalledWith(ctx, 'user-1', ['notification-1'], false);
    expect((notificationService as { markAllAsRead: ReturnType<typeof vi.fn> }).markAllAsRead)
      .toHaveBeenCalledWith(ctx, 'user-1');
  });

  it('rejects unknown notification types and unauthenticated access', async () => {
    const notificationService = {
      listNotifications: vi.fn(),
      countUnreadNotifications: vi.fn(),
      setNotificationReadState: vi.fn(),
      setNotificationsReadState: vi.fn(),
      markAllAsRead: vi.fn(),
    } as unknown as NotificationService;
    const resolver = new NotificationResolver(notificationService);

    expect(() => resolver.notifications({} as RequestContext, 20, undefined, 'unknown')).toThrow(
      /unsupported notification type/i,
    );
    expect(() => resolver.unreadNotificationsCount({} as RequestContext)).toThrow(
      /authenticated user/i,
    );
  });
});
