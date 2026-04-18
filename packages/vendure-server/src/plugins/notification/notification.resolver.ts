/**
 * Purpose: Expose authenticated notification feeds and read-state mutations through Vendure's shop API.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/api/common/request-context.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/notification/notification.resolver.test.ts
 */
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  Allow,
  Ctx,
  Permission,
  Transaction,
  type RequestContext,
} from '@vendure/core';
import {
  isNotificationType,
  NotificationType,
} from './notification.entity.js';
import {
  NotificationService,
  type NotificationCursorPage,
} from './notification.service.js';

@Resolver()
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @Query()
  @Allow(Permission.Owner)
  notifications(
    @Ctx() ctx: RequestContext,
    @Args('first', { nullable: true }) first?: number,
    @Args('after', { nullable: true }) after?: string,
    @Args('type', { nullable: true }) type?: string,
    @Args('read', { nullable: true }) read?: boolean,
  ): Promise<NotificationCursorPage> {
    const parsedType = type ? this.parseNotificationType(type) : undefined;
    return this.notificationService.listNotifications(ctx, this.requireActiveUserId(ctx), {
      first,
      after,
      type: parsedType,
      read,
    });
  }

  @Query()
  @Allow(Permission.Owner)
  unreadNotificationsCount(@Ctx() ctx: RequestContext): Promise<number> {
    return this.notificationService.countUnreadNotifications(ctx, this.requireActiveUserId(ctx));
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  markNotificationRead(
    @Ctx() ctx: RequestContext,
    @Args('notificationId') notificationId: string,
    @Args('read', { nullable: true }) read?: boolean,
  ) {
    return this.notificationService.setNotificationReadState(
      ctx,
      this.requireActiveUserId(ctx),
      notificationId,
      read ?? true,
    );
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  markNotificationsRead(
    @Ctx() ctx: RequestContext,
    @Args('notificationIds', { type: () => [String] }) notificationIds: string[],
    @Args('read', { nullable: true }) read?: boolean,
  ) {
    return this.notificationService.setNotificationsReadState(
      ctx,
      this.requireActiveUserId(ctx),
      notificationIds,
      read ?? true,
    );
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  markAllNotificationsRead(@Ctx() ctx: RequestContext): Promise<number> {
    return this.notificationService.markAllAsRead(ctx, this.requireActiveUserId(ctx));
  }

  private parseNotificationType(value: string): NotificationType {
    const normalized = value.trim().toLowerCase();
    if (!isNotificationType(normalized)) {
      throw new Error(`Unsupported notification type "${value}"`);
    }

    return normalized;
  }

  private requireActiveUserId(ctx: RequestContext): string {
    const activeUserId = ctx.activeUserId;
    if (!activeUserId) {
      throw new Error('Notification access requires an authenticated user.');
    }

    return String(activeUserId);
  }
}
