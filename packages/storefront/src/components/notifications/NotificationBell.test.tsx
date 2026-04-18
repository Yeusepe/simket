/**
 * Purpose: Verify the notification bell shows unread counts, recent items, and bell actions.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://www.heroui.com/docs/react/components/popover
 *   - https://www.heroui.com/docs/react/components/badge
 * Tests:
 *   - packages/storefront/src/components/notifications/NotificationBell.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './NotificationBell';
import type { NotificationsApi, AppNotification } from '../../types/notifications';

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

function createApi(): NotificationsApi {
  return {
    listNotifications: vi.fn(async () => ({
      items: [
        createNotification({ id: 'notification-1', title: 'Purchase complete' }),
        createNotification({ id: 'notification-2', type: 'product_update', title: 'Price drop' }),
      ],
      pageInfo: { endCursor: 'cursor-1', hasNextPage: false },
      unreadCount: 2,
    })),
    markNotificationRead: vi.fn(async ({ notificationId, read }) =>
      createNotification({ id: notificationId, read, readAt: read ? '2025-01-04T00:00:00.000Z' : null })),
    markAllNotificationsRead: vi.fn(async () => 2),
  };
}

describe('NotificationBell', () => {
  it('renders unread count, opens recent notifications, and navigates on selection', async () => {
    const api = createApi();
    const onNavigateTo = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NotificationBell api={api} onNavigateTo={onNavigateTo} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());

    await user.click(screen.getByLabelText('Notifications'));
    expect(await screen.findByText('Recent notifications')).toBeInTheDocument();
    expect(screen.getByText('Purchase complete')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /purchase complete/i }));
    expect(onNavigateTo).toHaveBeenCalledWith('/library');

    await user.click(screen.getByRole('button', { name: /mark all as read/i }));
    expect(api.markAllNotificationsRead).toHaveBeenCalled();
  });
});
