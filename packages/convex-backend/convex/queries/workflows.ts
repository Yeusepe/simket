/**
 * Purpose: Convex queries for workflow state and list views.
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

export const getWorkflow = query({
  args: {
    workflowId: v.string(),
  },
  handler: async (ctx, args) =>
    await ctx.db
      .query('workflows')
      .withIndex('by_workflowId', (q) => q.eq('workflowId', args.workflowId))
      .unique(),
});

export const listWorkflowsByType = query({
  args: {
    type: v.union(
      v.literal('checkout'),
      v.literal('asset_processing'),
      v.literal('payout'),
      v.literal('collaboration_setup'),
    ),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('running'),
        v.literal('completed'),
        v.literal('failed'),
        v.literal('cancelled'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const workflows = await ctx.db
      .query('workflows')
      .withIndex('by_type_status', (q) => q.eq('type', args.type))
      .collect();

    if (args.status === undefined) {
      return workflows;
    }

    return workflows.filter((workflow) => workflow.status === args.status);
  },
});
