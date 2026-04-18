/**
 * Purpose: Convex mutations for creating and updating user preference state.
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

export const upsertPreferences = mutation({
  args: {
    userId: v.string(),
    prefs: v.object({
      theme: v.union(
        v.literal('light'),
        v.literal('dark'),
        v.literal('system'),
      ),
      emailNotifications: v.boolean(),
      pushNotifications: v.boolean(),
      locale: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const updatedAt = Date.now();
    const existingPreferences = await ctx.db
      .query('userPreferences')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .unique();

    const document = {
      userId: args.userId,
      ...args.prefs,
      updatedAt,
    };

    if (existingPreferences === null) {
      return await ctx.db.insert('userPreferences', document);
    }

    await ctx.db.patch(existingPreferences._id, document);
    return existingPreferences._id;
  },
});
