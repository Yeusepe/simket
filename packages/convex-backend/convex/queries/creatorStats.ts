/**
 * Purpose: Convex queries for reactive creator dashboard statistics.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.convex.dev/functions/query-functions
 *   - https://docs.convex.dev/database/reading-data/
 * Tests:
 *   - packages/convex-backend/src/validators.test.ts
 */

import { v } from 'convex/values';

import { query } from '../_generated/server.js';

export const getCreatorStats = query({
  args: {
    creatorId: v.string(),
  },
  handler: async (ctx, args) =>
    await ctx.db
      .query('creatorStats')
      .withIndex('by_creatorId', (q) => q.eq('creatorId', args.creatorId))
      .unique(),
});
