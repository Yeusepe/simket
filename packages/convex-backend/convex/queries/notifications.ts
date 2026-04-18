/**
 * Purpose: Convex queries for real-time notification state.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://docs.convex.dev/functions/query-functions
 *   - https://docs.convex.dev/database/reading-data/
 * Tests:
 *   - packages/convex-backend/src/validators.test.ts
 */

import { v } from 'convex/values';

import { query } from '../_generated/server.js';

const DEFAULT_NOTIFICATION_LIMIT = 20;
const MAX_NOTIFICATION_LIMIT = 100;

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_NOTIFICATION_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('limit must be a positive integer');
  }

  return Math.min(limit, MAX_NOTIFICATION_LIMIT);
}

export const getNotifications = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeLimit(args.limit);

    return await ctx.db
      .query('notifications')
      .withIndex('by_userId_createdAt', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit);
  },
});

export const getUnreadCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query('notifications')
      .withIndex('by_userId_read', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('read'), false))
      .collect();

    return unreadNotifications.length;
  },
});
