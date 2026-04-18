/**
 * Purpose: Show unread notification counts and a recent-notifications popover in the storefront top bar.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://www.heroui.com/docs/react/components/popover
 *   - https://www.heroui.com/docs/react/components/badge
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/notifications/NotificationBell.test.tsx
 */
import { useCallback, useState } from 'react';
import { Badge, Button, Card, Popover, Spinner } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/use-notifications';
import type { AppNotification, NotificationsApi } from '../../types/notifications';
import {
  formatNotificationTimestamp,
  formatUnreadCount,
  getNotificationIcon,
  resolveNotificationHref,
} from './notification-utils';

export interface NotificationBellProps {
  readonly api?: NotificationsApi;
  readonly onNavigateTo?: (href: string) => void;
}

export function NotificationBell({
  api,
  onNavigateTo,
}: NotificationBellProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    isSubmitting,
    markNotificationRead,
    markAllAsRead,
  } = useNotifications({
    api,
    pageSize: 5,
  });

  const navigateTo = useCallback((href: string) => {
    if (onNavigateTo) {
      onNavigateTo(href);
      return;
    }

    navigate(href);
  }, [navigate, onNavigateTo]);

  const handleNotificationPress = useCallback(async (notification: AppNotification) => {
    if (!notification.read) {
      await markNotificationRead(notification.id, true);
    }

    setIsOpen(false);
    navigateTo(resolveNotificationHref(notification));
  }, [markNotificationRead, navigateTo]);

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger aria-label="Notifications">
        <Badge.Anchor>
          <Button isIconOnly variant="ghost" size="sm" aria-label="Notifications">
            🔔
          </Button>
          {unreadCount > 0 ? (
            <Badge color="warning" size="sm">
              {formatUnreadCount(unreadCount)}
            </Badge>
          ) : null}
        </Badge.Anchor>
      </Popover.Trigger>
      <Popover.Content className="w-[360px] max-w-[calc(100vw-2rem)] p-0">
        <Popover.Dialog className="outline-none">
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Popover.Heading>Recent notifications</Popover.Heading>
                <p className="text-sm text-muted-foreground">
                  Stay current on purchases, collaborators, and product updates.
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                isDisabled={unreadCount === 0 || isSubmitting}
                onPress={() => void markAllAsRead()}
              >
                Mark all as read
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Spinner size="sm" />
              </div>
            ) : notifications.length === 0 ? (
              <Card variant="transparent">
                <Card.Content>
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                </Card.Content>
              </Card>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <Button
                    key={notification.id}
                    className="h-auto w-full justify-start px-0 py-0"
                    variant="ghost"
                    onPress={() => void handleNotificationPress(notification)}
                  >
                    <Card className="w-full">
                      <Card.Content className="space-y-2 p-3 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span aria-hidden="true" className="text-lg">
                              {getNotificationIcon(notification.type)}
                            </span>
                            <div className="space-y-1">
                              <p className="font-medium">{notification.title}</p>
                              <p className="text-sm text-muted-foreground">{notification.body}</p>
                            </div>
                          </div>
                          {!notification.read ? (
                            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-warning" />
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatNotificationTimestamp(notification.createdAt)}
                        </p>
                      </Card.Content>
                    </Card>
                  </Button>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setIsOpen(false);
                  navigateTo('/notifications');
                }}
              >
                See all
              </Button>
            </div>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
