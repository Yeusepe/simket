/**
 * Purpose: Load, paginate, poll, and mutate storefront notification feeds through Vendure's shop API.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - https://developer.mozilla.org/docs/Web/API/Fetch_API
 * Tests:
 *   - packages/storefront/src/hooks/use-notifications.test.ts
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AppNotification,
  type NotificationConnection,
  type NotificationsApi,
  type NotificationsListRequest,
  type NotificationTypeFilter,
  isNotificationType,
} from '../types/notifications';

interface GraphqlError {
  readonly message: string;
}

interface GraphqlResponse<TData> {
  readonly data?: TData;
  readonly errors?: readonly GraphqlError[];
}

interface UseNotificationsOptions {
  readonly api?: NotificationsApi;
  readonly pageSize?: number;
  readonly initialTypeFilter?: NotificationTypeFilter;
  readonly pollIntervalMs?: number;
  readonly autoLoad?: boolean;
}

export interface UseNotificationsResult {
  readonly notifications: readonly AppNotification[];
  readonly unreadCount: number;
  readonly hasNextPage: boolean;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly isSubmitting: boolean;
  readonly error: string | null;
  readonly typeFilter: NotificationTypeFilter;
  readonly setTypeFilter: (type: NotificationTypeFilter) => void;
  readonly refresh: () => Promise<void>;
  readonly loadMore: () => Promise<void>;
  readonly markNotificationRead: (notificationId: string, read?: boolean) => Promise<void>;
  readonly markAllAsRead: () => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_POLL_INTERVAL_MS = 30_000;

const LIST_NOTIFICATIONS_QUERY = `
  query Notifications($first: Int!, $after: String, $type: NotificationType, $read: Boolean) {
    notifications(first: $first, after: $after, type: $type, read: $read) {
      items {
        id
        recipientId
        type
        title
        body
        data
        read
        readAt
        createdAt
        updatedAt
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      unreadCount
    }
  }
`;

const MARK_NOTIFICATION_READ_MUTATION = `
  mutation MarkNotificationRead($notificationId: String!, $read: Boolean) {
    markNotificationRead(notificationId: $notificationId, read: $read) {
      id
      recipientId
      type
      title
      body
      data
      read
      readAt
      createdAt
      updatedAt
    }
  }
`;

const MARK_ALL_NOTIFICATIONS_READ_MUTATION = `
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

function getShopApiUrl(): string {
  const configuredUrl = import.meta.env.VITE_SIMKET_SHOP_API_URL;
  if (typeof configuredUrl === 'string' && configuredUrl.length > 0) {
    return configuredUrl;
  }

  return new URL('/shop-api', window.location.origin).toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNotificationData(value: unknown): value is Record<string, unknown> | null {
  return value === null || isRecord(value);
}

function isNotification(value: unknown): value is AppNotification {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.recipientId === 'string' &&
    isNotificationType(value.type) &&
    typeof value.title === 'string' &&
    typeof value.body === 'string' &&
    isNotificationData(value.data) &&
    typeof value.read === 'boolean' &&
    (value.readAt === null || typeof value.readAt === 'string') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isNotificationConnection(value: unknown): value is NotificationConnection {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isNotification) &&
    isRecord(value.pageInfo) &&
    (value.pageInfo.endCursor === null || typeof value.pageInfo.endCursor === 'string') &&
    typeof value.pageInfo.hasNextPage === 'boolean' &&
    typeof value.unreadCount === 'number'
  );
}

async function fetchShopGraphql<TData>(
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> {
  const response = await globalThis.fetch(getShopApiUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Notification request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GraphqlResponse<TData>;
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0]?.message ?? 'Notification request failed.');
  }

  if (!payload.data) {
    throw new Error('Notification response did not include data.');
  }

  return payload.data;
}

export function createNotificationsApi(): NotificationsApi {
  return {
    async listNotifications(request) {
      const data = await fetchShopGraphql<{ notifications: unknown }>(LIST_NOTIFICATIONS_QUERY, {
        first: request.first,
        after: request.after ?? null,
        type: request.type ?? null,
        read: request.read ?? null,
      });

      if (!isNotificationConnection(data.notifications)) {
        throw new Error('Invalid notifications response.');
      }

      return data.notifications;
    },
    async markNotificationRead(input) {
      const data = await fetchShopGraphql<{ markNotificationRead: unknown }>(
        MARK_NOTIFICATION_READ_MUTATION,
        {
          notificationId: input.notificationId,
          read: input.read,
        },
      );

      if (!isNotification(data.markNotificationRead)) {
        throw new Error('Invalid notification mutation response.');
      }

      return data.markNotificationRead;
    },
    async markAllNotificationsRead() {
      const data = await fetchShopGraphql<{ markAllNotificationsRead: unknown }>(
        MARK_ALL_NOTIFICATIONS_READ_MUTATION,
        {},
      );

      if (typeof data.markAllNotificationsRead !== 'number') {
        throw new Error('Invalid mark-all-notifications response.');
      }

      return data.markAllNotificationsRead;
    },
  };
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Notification request failed.';
}

function upsertNotification(
  notifications: readonly AppNotification[],
  notification: AppNotification,
): readonly AppNotification[] {
  const otherNotifications = notifications.filter((item) => item.id !== notification.id);
  return [notification, ...otherNotifications].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id),
  );
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsResult {
  const api = useMemo(() => options.api ?? createNotificationsApi(), [options.api]);
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const autoLoad = options.autoLoad ?? true;
  const [notifications, setNotifications] = useState<readonly AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>(
    options.initialTypeFilter ?? 'all',
  );

  const type = typeFilter === 'all' ? undefined : typeFilter;

  const loadPage = useCallback(async (request: NotificationsListRequest, mode: 'replace' | 'append') => {
    const response = await api.listNotifications(request);
    setNotifications((current) =>
      mode === 'append' ? [...current, ...response.items] : response.items,
    );
    setUnreadCount(response.unreadCount);
    setHasNextPage(response.pageInfo.hasNextPage);
    setEndCursor(response.pageInfo.endCursor);
  }, [api]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      if (notifications.length === 0) {
        setIsLoading(true);
      }
      await loadPage(
        {
          first: Math.max(pageSize, notifications.length || pageSize),
          type,
        },
        'replace',
      );
    } catch (caughtError) {
      setError(normalizeError(caughtError));
      setNotifications([]);
      setUnreadCount(0);
      setHasNextPage(false);
      setEndCursor(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadPage, notifications.length, pageSize, type]);

  useEffect(() => {
    if (!autoLoad) {
      setIsLoading(false);
      return;
    }

    void refresh();
  }, [autoLoad, refresh]);

  useEffect(() => {
    if (!autoLoad || pollIntervalMs <= 0) {
      return;
    }

    const intervalId = globalThis.setInterval(() => {
      void refresh();
    }, pollIntervalMs);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [autoLoad, pollIntervalMs, refresh]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || !endCursor) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);
    try {
      await loadPage(
        {
          first: pageSize,
          after: endCursor,
          type,
        },
        'append',
      );
    } catch (caughtError) {
      setError(normalizeError(caughtError));
    } finally {
      setIsLoadingMore(false);
    }
  }, [endCursor, hasNextPage, loadPage, pageSize, type]);

  const markNotificationRead = useCallback(async (notificationId: string, read = true) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await api.markNotificationRead({ notificationId, read });
      setNotifications((current) => upsertNotification(current, updated));
      setUnreadCount((current) => {
        const existing = notifications.find((item) => item.id === notificationId);
        if (!existing || existing.read === read) {
          return current;
        }

        return read ? Math.max(0, current - 1) : current + 1;
      });
    } catch (caughtError) {
      setError(normalizeError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }, [api, notifications]);

  const markAllAsRead = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.markAllNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({
        ...notification,
        read: true,
        readAt: notification.readAt ?? now,
      })));
      setUnreadCount(0);
    } catch (caughtError) {
      setError(normalizeError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }, [api]);

  return {
    notifications,
    unreadCount,
    hasNextPage,
    isLoading,
    isLoadingMore,
    isSubmitting,
    error,
    typeFilter,
    setTypeFilter,
    refresh,
    loadMore,
    markNotificationRead,
    markAllAsRead,
  };
}
