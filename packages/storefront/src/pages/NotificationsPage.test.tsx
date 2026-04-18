/**
 * Purpose: Verify the notifications page filters items, paginates results, and updates read state.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/pages/NotificationsPage.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsPage } from './NotificationsPage';
import type { AppNotification, NotificationsApi } from '../types/notifications';

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
    listNotifications: vi.fn(async ({ after, type }) => {
      if (type === 'product_update') {
        return {
          items: [createNotification({ id: 'notification-2', type: 'product_update', title: 'Product updated' })],
          pageInfo: { endCursor: 'product-cursor', hasNextPage: false },
          unreadCount: 1,
        };
      }

      if (after) {
        return {
          items: [createNotification({ id: 'notification-3', type: 'review', title: 'New review' })],
          pageInfo: { endCursor: 'cursor-2', hasNextPage: false },
          unreadCount: 2,
        };
      }

      return {
        items: [
          createNotification({ id: 'notification-1', type: 'purchase', title: 'Purchase complete' }),
          createNotification({ id: 'notification-2', type: 'product_update', title: 'Product updated' }),
        ],
        pageInfo: { endCursor: 'cursor-1', hasNextPage: true },
        unreadCount: 2,
      };
    }),
    markNotificationRead: vi.fn(async ({ notificationId, read }) =>
      createNotification({ id: notificationId, read, readAt: read ? '2025-01-04T00:00:00.000Z' : null })),
    markAllNotificationsRead: vi.fn(async () => 3),
  };
}

describe('NotificationsPage', () => {
  it('filters notifications, paginates with load more, and toggles read state', async () => {
    const api = createApi();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <NotificationsPage api={api} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Purchase complete')).toBeInTheDocument());
    expect(screen.getByText('Product updated')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /load more notifications/i }));
    expect(await screen.findByText('New review')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /product updates/i }));
    await waitFor(() => expect(screen.queryByText('Purchase complete')).not.toBeInTheDocument());
    expect(screen.getByText('Product updated')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mark as read for product updated/i }));
    expect(api.markNotificationRead).toHaveBeenCalledWith({ notificationId: 'notification-2', read: true });
  });
});
