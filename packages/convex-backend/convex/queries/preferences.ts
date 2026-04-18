/**
 * Purpose: Convex queries for user preference state.
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

export const getUserPreferences = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) =>
    await ctx.db
      .query('userPreferences')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .unique(),
});
