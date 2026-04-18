/**
 * Purpose: Create, paginate, update, and clean up in-app notifications for authenticated users.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/connection/transactional-connection.d.ts
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/
 * Tests:
 *   - packages/vendure-server/src/plugins/notification/notification.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { RequestContext, TransactionalConnection } from '@vendure/core';
import {
  NotificationEntity,
  type NotificationPayload,
  NotificationType,
} from './notification.entity.js';

interface NotificationRepository {
  create(input: Partial<NotificationEntity>): NotificationEntity;
  save(entity: NotificationEntity): Promise<NotificationEntity>;
  find(options?: {
    readonly where?: Partial<NotificationEntity>;
    readonly order?: {
      readonly createdAt?: 'ASC' | 'DESC';
      readonly id?: 'ASC' | 'DESC';
    };
  }): Promise<NotificationEntity[]>;
  findOneBy(where: Partial<NotificationEntity>): Promise<NotificationEntity | null>;
  remove(entities: NotificationEntity[]): Promise<NotificationEntity[]>;
}

export interface NotificationCursorPage {
  readonly items: readonly NotificationEntity[];
  readonly pageInfo: {
    readonly endCursor: string | null;
    readonly hasNextPage: boolean;
  };
  readonly unreadCount: number;
}

export interface CreateNotificationInput {
  readonly recipientId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly data?: NotificationPayload | null;
}

export interface NotificationListOptions {
  readonly first?: number;
  readonly after?: string;
  readonly type?: NotificationType;
  readonly read?: boolean;
}

const tracer = trace.getTracer('simket-notifications');
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface NotificationCursor {
  readonly createdAt: string;
  readonly id: string;
}

export function encodeNotificationCursor(notification: Pick<NotificationEntity, 'id' | 'createdAt'>): string {
  return Buffer.from(
    JSON.stringify({
      id: notification.id,
      createdAt: notification.createdAt.toISOString(),
    } satisfies NotificationCursor),
    'utf8',
  ).toString('base64url');
}

export function decodeNotificationCursor(cursor: string): NotificationCursor {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'id' in parsed &&
      'createdAt' in parsed &&
      typeof parsed.id === 'string' &&
      typeof parsed.createdAt === 'string'
    ) {
      return {
        id: parsed.id,
        createdAt: parsed.createdAt,
      };
    }
  } catch {
    // fall through
  }

  throw new Error('Invalid notification cursor.');
}

function normalizeRecipientId(recipientId: string): string {
  const normalized = recipientId.trim();
  if (normalized.length === 0) {
    throw new Error('Notification recipientId is required.');
  }

  return normalized;
}

function normalizePageSize(first: number | undefined): number {
  if (first === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  if (!Number.isInteger(first) || first <= 0) {
    throw new Error('Notification page size must be a positive integer.');
  }

  return Math.min(first, MAX_PAGE_SIZE);
}

function sortNotifications(notifications: readonly NotificationEntity[]): NotificationEntity[] {
  return [...notifications].sort((left, right) => {
    const createdAtDelta = right.createdAt.getTime() - left.createdAt.getTime();
    if (createdAtDelta !== 0) {
      return createdAtDelta;
    }

    return right.id.localeCompare(left.id);
  });
}

function matchesCursor(notification: NotificationEntity, cursor: NotificationCursor): boolean {
  return (
    notification.id === cursor.id &&
    notification.createdAt.toISOString() === cursor.createdAt
  );
}

@Injectable()
export class NotificationService {
  constructor(private readonly connection: Pick<TransactionalConnection, 'getRepository'>) {}

  async createNotification(
    input: CreateNotificationInput,
  ): Promise<NotificationEntity> {
    return tracer.startActiveSpan('notifications.create', async (span) => {
      try {
        const recipientId = normalizeRecipientId(input.recipientId);
        span.setAttribute('notification.recipient_id', recipientId);
        span.setAttribute('notification.type', input.type);

        const repository = this.getRepository(undefined);
        const notification = repository.create({
          recipientId,
          type: input.type,
          title: input.title.trim(),
          body: input.body.trim(),
          data: input.data ?? null,
          read: false,
          readAt: null,
        });
        const created = await repository.save(notification);

        await tracer.startActiveSpan('notifications.deliver', async (deliverySpan) => {
          deliverySpan.setAttribute('notification.id', created.id);
          deliverySpan.setAttribute('notification.recipient_id', created.recipientId);
          deliverySpan.end();
        });

        return created;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async listNotifications(
    ctx: RequestContext | undefined,
    recipientId: string,
    options: NotificationListOptions = {},
  ): Promise<NotificationCursorPage> {
    return tracer.startActiveSpan('notifications.list', async (span) => {
      try {
        const normalizedRecipientId = normalizeRecipientId(recipientId);
        const pageSize = normalizePageSize(options.first);
        span.setAttribute('notification.recipient_id', normalizedRecipientId);
        span.setAttribute('notification.page_size', pageSize);
        if (options.type) {
          span.setAttribute('notification.type', options.type);
        }
        if (typeof options.read === 'boolean') {
          span.setAttribute('notification.read_filter', options.read);
        }

        const notifications = sortNotifications(await this.getRepository(ctx).find({
          where: { recipientId: normalizedRecipientId },
          order: { createdAt: 'DESC', id: 'DESC' },
        }));
        const filtered = notifications.filter((notification) => {
          const matchesType = !options.type || notification.type === options.type;
          const matchesRead = typeof options.read !== 'boolean' || notification.read === options.read;
          return matchesType && matchesRead;
        });

        const afterCursor = options.after ? decodeNotificationCursor(options.after) : null;
        const startIndex = afterCursor
          ? filtered.findIndex((notification) => matchesCursor(notification, afterCursor)) + 1
          : 0;
        if (options.after && startIndex === 0) {
          throw new Error('Notification cursor does not match the current feed.');
        }

        const items = filtered.slice(startIndex, startIndex + pageSize);
        const endCursor = items.length > 0 ? encodeNotificationCursor(items[items.length - 1]!) : null;
        const unreadCount = notifications.filter((notification) => !notification.read).length;

        span.setAttribute('notification.count', items.length);
        span.setAttribute('notification.unread_count', unreadCount);

        return {
          items,
          pageInfo: {
            endCursor,
            hasNextPage: startIndex + items.length < filtered.length,
          },
          unreadCount,
        };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async countUnreadNotifications(
    ctx: RequestContext | undefined,
    recipientId: string,
  ): Promise<number> {
    const notifications = await this.getRepository(ctx).find({
      where: {
        recipientId: normalizeRecipientId(recipientId),
        read: false,
      },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return notifications.length;
  }

  async setNotificationReadState(
    ctx: RequestContext | undefined,
    recipientId: string,
    notificationId: string,
    read: boolean,
  ): Promise<NotificationEntity> {
    return tracer.startActiveSpan('notifications.setReadState', async (span) => {
      try {
        const normalizedRecipientId = normalizeRecipientId(recipientId);
        span.setAttribute('notification.id', notificationId);
        span.setAttribute('notification.recipient_id', normalizedRecipientId);
        span.setAttribute('notification.read', read);

        const repository = this.getRepository(ctx);
        const notification = await repository.findOneBy({
          id: notificationId,
          recipientId: normalizedRecipientId,
        });

        if (!notification) {
          throw new Error(`Notification "${notificationId}" does not exist.`);
        }

        notification.read = read;
        notification.readAt = read ? new Date() : null;
        notification.updatedAt = new Date();
        return await repository.save(notification);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async setNotificationsReadState(
    ctx: RequestContext | undefined,
    recipientId: string,
    notificationIds: readonly string[],
    read: boolean,
  ): Promise<NotificationEntity[]> {
    const results: NotificationEntity[] = [];
    for (const notificationId of notificationIds) {
      results.push(
        await this.setNotificationReadState(ctx, recipientId, notificationId, read),
      );
    }

    return results;
  }

  async markAllAsRead(
    ctx: RequestContext | undefined,
    recipientId: string,
  ): Promise<number> {
    const notifications = await this.getRepository(ctx).find({
      where: { recipientId: normalizeRecipientId(recipientId) },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    let updated = 0;
    for (const notification of notifications) {
      if (notification.read) {
        continue;
      }

      notification.read = true;
      notification.readAt = new Date();
      notification.updatedAt = new Date();
      await this.getRepository(ctx).save(notification);
      updated += 1;
    }

    return updated;
  }

  async deleteNotificationsBefore(
    ctx: RequestContext | undefined,
    cutoff: Date,
  ): Promise<number> {
    const notifications = await this.getRepository(ctx).find({
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    const expired = notifications.filter((notification) => notification.createdAt < cutoff);
    if (expired.length === 0) {
      return 0;
    }

    await this.getRepository(ctx).remove(expired);
    return expired.length;
  }

  private getRepository(ctx: RequestContext | undefined): NotificationRepository {
    return this.connection.getRepository(ctx, NotificationEntity) as NotificationRepository;
  }
}
