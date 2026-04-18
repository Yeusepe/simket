/**
 * Purpose: Render the full notifications page with filters, pagination, and read-state actions.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 *   - https://www.heroui.com/docs/react/components/spinner
 * Tests:
 *   - packages/storefront/src/pages/NotificationsPage.test.tsx
 */
import { Button, Card, Spinner } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/use-notifications';
import type { NotificationTypeFilter, NotificationsApi } from '../types/notifications';
import { NOTIFICATION_TYPES } from '../types/notifications';
import {
  formatNotificationTimestamp,
  getNotificationIcon,
  getNotificationTypeLabel,
  resolveNotificationHref,
} from '../components/notifications/notification-utils';

export interface NotificationsPageProps {
  readonly api?: NotificationsApi;
  readonly pollIntervalMs?: number;
}

const FILTERS: readonly NotificationTypeFilter[] = ['all', ...NOTIFICATION_TYPES];

export function NotificationsPage({ api, pollIntervalMs }: NotificationsPageProps) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    hasNextPage,
    isLoading,
    isLoadingMore,
    isSubmitting,
    error,
    typeFilter,
    setTypeFilter,
    loadMore,
    markNotificationRead,
    markAllAsRead,
  } = useNotifications({ api, pageSize: 20, pollIntervalMs });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Follow purchases, collaborators, settlements, and product changes in one feed.
          </p>
        </div>
        <Button
          variant="secondary"
          isDisabled={unreadCount === 0 || isSubmitting}
          onPress={() => void markAllAsRead()}
        >
          Mark all as read
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Notification type filters">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            variant={typeFilter === filter ? 'secondary' : 'ghost'}
            size="sm"
            onPress={() => setTypeFilter(filter)}
          >
            {filter === 'all' ? 'All notifications' : getNotificationTypeLabel(filter)}
          </Button>
        ))}
      </div>

      {error ? (
        <Card>
          <Card.Content>
            <p className="text-sm text-danger">{error}</p>
          </Card.Content>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <Card.Header>
            <Card.Title>No notifications yet</Card.Title>
            <Card.Description>
              {typeFilter === 'all'
                ? 'You will see purchases, product updates, and collaboration activity here.'
                : `No ${getNotificationTypeLabel(typeFilter).toLowerCase()} to show right now.`}
            </Card.Description>
          </Card.Header>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card key={notification.id} variant={notification.read ? 'default' : 'secondary'}>
              <Card.Content className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="text-2xl">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {getNotificationTypeLabel(notification.type)}
                      </p>
                      <h2 className="text-lg font-semibold">{notification.title}</h2>
                      <p className="text-sm text-muted-foreground">{notification.body}</p>
                    </div>
                  </div>
                  {!notification.read ? (
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-warning" />
                  ) : null}
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {formatNotificationTimestamp(notification.createdAt)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`${notification.read ? 'Mark as unread' : 'Mark as read'} for ${notification.title}`}
                      onPress={() => void markNotificationRead(notification.id, !notification.read)}
                    >
                      {notification.read ? 'Mark unread' : 'Mark read'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => navigate(resolveNotificationHref(notification))}
                    >
                      Open
                    </Button>
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            isDisabled={isLoadingMore}
            aria-label="Load more notifications"
            onPress={() => void loadMore()}
          >
            {isLoadingMore ? 'Loading…' : 'Load more notifications'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
