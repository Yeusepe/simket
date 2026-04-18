/**
 * Purpose: Verify notification hook loading, pagination, polling-friendly refresh, and read-state updates.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://testing-library.com/docs/react-testing-library/api/#renderhook
 *   - https://react.dev/reference/react/useEffect
 * Tests:
 *   - packages/storefront/src/hooks/use-notifications.test.ts
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useNotifications } from './use-notifications';
import type {
  AppNotification,
  NotificationConnection,
  NotificationsApi,
  NotificationType,
} from '../types/notifications';

function createNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: overrides.id ?? 'notification-1',
    recipientId: overrides.recipientId ?? 'user-1',
    type: overrides.type ?? 'purchase',
    title: overrides.title ?? 'Purchase complete',
    body: overrides.body ?? 'Terrain Pack is now ready to download.',
    data: overrides.data ?? { href: '/library' },
    read: overrides.read ?? false,
    readAt: overrides.readAt ?? null,
    createdAt: overrides.createdAt ?? '2025-01-03T12:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2025-01-03T12:00:00.000Z',
  };
}

function createConnection(
  items: readonly AppNotification[],
  overrides: Partial<NotificationConnection> = {},
): NotificationConnection {
  return {
    items,
    pageInfo: overrides.pageInfo ?? {
      endCursor: items.at(-1)?.id ?? null,
      hasNextPage: false,
    },
    unreadCount: overrides.unreadCount ?? items.filter((item) => !item.read).length,
  };
}

function createApi(): NotificationsApi {
  const pages: Record<'all' | NotificationType, readonly NotificationConnection[]> = {
    all: [
      createConnection(
        [
          createNotification({ id: 'notification-1', type: 'purchase' }),
          createNotification({ id: 'notification-2', type: 'product_update', createdAt: '2025-01-02T12:00:00.000Z' }),
        ],
        {
          pageInfo: { endCursor: 'cursor-1', hasNextPage: true },
          unreadCount: 2,
        },
      ),
      createConnection(
        [
          createNotification({ id: 'notification-3', type: 'review', createdAt: '2025-01-01T12:00:00.000Z' }),
        ],
        {
          pageInfo: { endCursor: 'cursor-2', hasNextPage: false },
          unreadCount: 2,
        },
      ),
    ],
    product_update: [
      createConnection(
        [
          createNotification({ id: 'notification-2', type: 'product_update' }),
        ],
        {
          pageInfo: { endCursor: 'product-cursor', hasNextPage: false },
          unreadCount: 1,
        },
      ),
    ],
    purchase: [],
    collaboration_invite: [],
    collaboration_accepted: [],
    price_drop: [],
    system: [],
    gift_received: [],
    review: [],
    settlement: [],
  };

  return {
    listNotifications: vi.fn(async ({ after, type }) => {
      const key: 'all' | NotificationType = type ?? 'all';
      const list = pages[key] ?? [];
      return after ? list[1] ?? createConnection([]) : list[0] ?? createConnection([]);
    }),
    markNotificationRead: vi.fn(async ({ notificationId, read }) =>
      createNotification({
        id: notificationId,
        type: 'purchase',
        read,
        readAt: read ? '2025-01-04T00:00:00.000Z' : null,
      })),
    markAllNotificationsRead: vi.fn(async () => 3),
  };
}

describe('useNotifications', () => {
  it('loads notifications, paginates, and filters by type', async () => {
    const api = createApi();
    const { result } = renderHook(() => useNotifications({ api, pageSize: 2, pollIntervalMs: 0 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications.map((item) => item.id)).toEqual([
      'notification-1',
      'notification-2',
    ]);
    expect(result.current.unreadCount).toBe(2);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.notifications.map((item) => item.id)).toEqual([
      'notification-1',
      'notification-2',
      'notification-3',
    ]);

    await act(async () => {
      result.current.setTypeFilter('product_update');
    });

    await waitFor(() => expect(result.current.notifications.map((item) => item.id)).toEqual(['notification-2']));
    expect((api.listNotifications as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0]).toMatchObject({
      type: 'product_update',
      first: 2,
    });
  });

  it('marks single notifications and all notifications as read in local state', async () => {
    const api = createApi();
    const { result } = renderHook(() => useNotifications({ api, pageSize: 2, pollIntervalMs: 0 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.markNotificationRead('notification-1', true);
    });
    expect(result.current.notifications.find((item) => item.id === 'notification-1')?.read).toBe(true);
    expect(result.current.unreadCount).toBe(1);

    await act(async () => {
      await result.current.markAllAsRead();
    });
    expect(result.current.notifications.every((item) => item.read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });
});
