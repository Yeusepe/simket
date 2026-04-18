/**
 * Purpose: Convex mutations for creating and acknowledging user notifications.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://docs.convex.dev/functions/mutation-functions
 *   - https://docs.convex.dev/database/writing-data/
 * Tests:
 *   - packages/convex-backend/src/validators.test.ts
 */

import { v } from 'convex/values';

import { mutation } from '../_generated/server.js';

export const createNotification = mutation({
  args: {
    params: v.object({
      userId: v.string(),
      type: v.union(
        v.literal('order.completed'),
        v.literal('collaboration.invited'),
        v.literal('collaboration.accepted'),
        v.literal('product.published'),
        v.literal('review.received'),
        v.literal('payout.sent'),
      ),
      title: v.string(),
      body: v.string(),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) =>
    await ctx.db.insert('notifications', {
      ...args.params,
      read: false,
      createdAt: Date.now(),
    }),
});

export const markAsRead = mutation({
  args: {
    notificationId: v.id('notifications'),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (notification === null) {
      return null;
    }

    if (!notification.read) {
      await ctx.db.patch(args.notificationId, { read: true });
    }

    return args.notificationId;
  },
});

export const markAllAsRead = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query('notifications')
      .withIndex('by_userId_read', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('read'), false))
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { read: true });
    }

    return unreadNotifications.length;
  },
});
