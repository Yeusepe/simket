/**
 * Purpose: Verify notification persistence, cursor pagination, read-state changes, and cleanup.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/domain-model.md (§1 core records)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/api/common/request-context.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/notification/notification.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { TransactionalConnection } from '@vendure/core';
import {
  NotificationEntity,
  NotificationType,
} from './notification.entity.js';
import { NotificationService } from './notification.service.js';

class MemoryNotificationRepository {
  private readonly rows = new Map<string, NotificationEntity>();
  private nextId = 1;

  create(input: Partial<NotificationEntity>): NotificationEntity {
    return new NotificationEntity(input);
  }

  async save(entity: NotificationEntity): Promise<NotificationEntity> {
    if (!entity.id) {
      entity.id = `notification-${this.nextId++}`;
    }

    const now = entity.updatedAt ?? entity.createdAt ?? new Date('2025-01-01T00:00:00.000Z');
    entity.createdAt = entity.createdAt ?? now;
    entity.updatedAt = now;
    this.rows.set(entity.id, cloneNotification(entity));
    return cloneNotification(entity);
  }

  async find(options?: {
    readonly where?: Partial<NotificationEntity>;
    readonly order?: {
      readonly createdAt?: 'ASC' | 'DESC';
      readonly id?: 'ASC' | 'DESC';
    };
  }): Promise<NotificationEntity[]> {
    const results = [...this.rows.values()]
      .filter((row) => (options?.where ? matchesWhere(row, options.where) : true))
      .map(cloneNotification);

    if (options?.order) {
      results.sort((left, right) => {
        const createdAtDirection = options.order?.createdAt ?? 'DESC';
        const createdAtDelta = left.createdAt.getTime() - right.createdAt.getTime();
        if (createdAtDelta !== 0) {
          return createdAtDirection === 'ASC' ? createdAtDelta : -createdAtDelta;
        }

        const idDirection = options.order?.id ?? 'DESC';
        const idDelta = left.id.localeCompare(right.id);
        return idDirection === 'ASC' ? idDelta : -idDelta;
      });
    }

    return results;
  }

  async findOneBy(where: Partial<NotificationEntity>): Promise<NotificationEntity | null> {
    return [...this.rows.values()].find((row) => matchesWhere(row, where)) ?? null;
  }

  async remove(entities: NotificationEntity[]): Promise<NotificationEntity[]> {
    for (const entity of entities) {
      this.rows.delete(entity.id);
    }

    return entities.map(cloneNotification);
  }

  seed(entity: NotificationEntity): void {
    this.rows.set(entity.id, cloneNotification(entity));
  }
}

function cloneNotification(entity: NotificationEntity): NotificationEntity {
  return new NotificationEntity({
    ...entity,
    data: entity.data ? structuredClone(entity.data) : null,
    readAt: entity.readAt ? new Date(entity.readAt) : null,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  });
}

function matchesWhere<T extends object>(entity: T, where: Partial<T>): boolean {
  return Object.entries(where).every(([key, value]) => entity[key as keyof T] === value);
}

function createService(repository = new MemoryNotificationRepository()) {
  const connection = {
    getRepository: vi.fn().mockReturnValue(repository),
  } as unknown as Pick<TransactionalConnection, 'getRepository'>;

  return {
    service: new NotificationService(connection),
    repository,
  };
}

function createNotification(overrides: Partial<NotificationEntity> = {}): NotificationEntity {
  return new NotificationEntity({
    id: overrides.id ?? 'notification-seeded',
    recipientId: overrides.recipientId ?? 'user-1',
    type: overrides.type ?? NotificationType.Purchase,
    title: overrides.title ?? 'Purchase complete',
    body: overrides.body ?? 'Your order is ready to download.',
    data: overrides.data ?? { href: '/library' },
    read: overrides.read ?? false,
    readAt: overrides.readAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2025-01-03T12:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2025-01-03T12:00:00.000Z'),
  });
}

describe('NotificationService', () => {
  it('creates notifications and counts unread items', async () => {
    const { service } = createService();

    const created = await service.createNotification({
      recipientId: 'user-1',
      type: NotificationType.Purchase,
      title: 'Purchase complete',
      body: 'Terrain Pack is now in your library.',
      data: { orderId: 'order-1', href: '/library' },
    });

    expect(created.id).toBe('notification-1');
    expect(created.read).toBe(false);
    await expect(service.countUnreadNotifications(undefined, 'user-1')).resolves.toBe(1);
  });

  it('paginates notifications using cursors and type filters', async () => {
    const { service, repository } = createService();
    repository.seed(
      createNotification({
        id: 'notification-1',
        createdAt: new Date('2025-01-03T12:00:00.000Z'),
        updatedAt: new Date('2025-01-03T12:00:00.000Z'),
        type: NotificationType.Purchase,
      }),
    );
    repository.seed(
      createNotification({
        id: 'notification-2',
        createdAt: new Date('2025-01-02T12:00:00.000Z'),
        updatedAt: new Date('2025-01-02T12:00:00.000Z'),
        type: NotificationType.ProductUpdate,
      }),
    );
    repository.seed(
      createNotification({
        id: 'notification-3',
        createdAt: new Date('2025-01-01T12:00:00.000Z'),
        updatedAt: new Date('2025-01-01T12:00:00.000Z'),
        type: NotificationType.ProductUpdate,
      }),
    );

    const firstPage = await service.listNotifications(undefined, 'user-1', {
      first: 1,
      type: NotificationType.ProductUpdate,
    });

    expect(firstPage.items.map((item) => item.id)).toEqual(['notification-2']);
    expect(firstPage.pageInfo.hasNextPage).toBe(true);

    const secondPage = await service.listNotifications(undefined, 'user-1', {
      first: 1,
      type: NotificationType.ProductUpdate,
      after: firstPage.pageInfo.endCursor ?? undefined,
    });

    expect(secondPage.items.map((item) => item.id)).toEqual(['notification-3']);
    expect(secondPage.pageInfo.hasNextPage).toBe(false);
  });

  it('marks individual and bulk notifications as read or unread', async () => {
    const { service, repository } = createService();
    repository.seed(createNotification({ id: 'notification-1', read: false }));
    repository.seed(createNotification({ id: 'notification-2', read: false }));

    const marked = await service.setNotificationReadState(undefined, 'user-1', 'notification-1', true);
    expect(marked.read).toBe(true);
    expect(marked.readAt).toBeInstanceOf(Date);

    const bulk = await service.setNotificationsReadState(
      undefined,
      'user-1',
      ['notification-1', 'notification-2'],
      false,
    );

    expect(bulk.map((item) => item.read)).toEqual([false, false]);
    expect(bulk.every((item) => item.readAt === null)).toBe(true);
  });

  it('marks all notifications as read and removes expired notifications', async () => {
    const { service, repository } = createService();
    repository.seed(
      createNotification({
        id: 'notification-1',
        createdAt: new Date('2024-01-01T12:00:00.000Z'),
        updatedAt: new Date('2024-01-01T12:00:00.000Z'),
      }),
    );
    repository.seed(
      createNotification({
        id: 'notification-2',
        createdAt: new Date('2025-01-03T12:00:00.000Z'),
        updatedAt: new Date('2025-01-03T12:00:00.000Z'),
      }),
    );

    await expect(service.markAllAsRead(undefined, 'user-1')).resolves.toBe(2);
    await expect(
      service.deleteNotificationsBefore(undefined, new Date('2025-01-01T00:00:00.000Z')),
    ).resolves.toBe(1);

    const remaining = await service.listNotifications(undefined, 'user-1', { first: 10 });
    expect(remaining.items.map((item) => item.id)).toEqual(['notification-2']);
    expect(remaining.unreadCount).toBe(0);
  });
});
