/**
 * Purpose: Convex mutations for durable workflow creation and status updates.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.convex.dev/functions/mutation-functions
 *   - https://docs.convex.dev/database/writing-data/
 * Tests:
 *   - packages/convex-backend/src/validators.test.ts
 */

import { v } from 'convex/values';

import { mutation } from '../_generated/server.js';
import {
  buildWorkflowId,
  validateWorkflowTransition,
} from '../lib/validators.js';

export const createWorkflow = mutation({
  args: {
    params: v.object({
      type: v.union(
        v.literal('checkout'),
        v.literal('asset_processing'),
        v.literal('payout'),
        v.literal('collaboration_setup'),
      ),
      entityId: v.string(),
      input: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const workflowId = buildWorkflowId(args.params.type, args.params.entityId);
    const existingWorkflow = await ctx.db
      .query('workflows')
      .withIndex('by_workflowId', (q) => q.eq('workflowId', workflowId))
      .unique();

    if (existingWorkflow !== null) {
      throw new Error(`Workflow already exists: ${workflowId}`);
    }

    const timestamp = Date.now();
    const document = {
      workflowId,
      type: args.params.type,
      status: 'pending' as const,
      entityId: args.params.entityId,
      input: args.params.input,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const documentId = await ctx.db.insert('workflows', document);

    return {
      documentId,
      workflowId,
    };
  },
});

export const updateWorkflowStatus = mutation({
  args: {
    workflowId: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled'),
    ),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db
      .query('workflows')
      .withIndex('by_workflowId', (q) => q.eq('workflowId', args.workflowId))
      .unique();

    if (workflow === null) {
      throw new Error(`Workflow not found: ${args.workflowId}`);
    }

    if (!validateWorkflowTransition(workflow.status, args.status)) {
      throw new Error(
        `Invalid workflow transition: ${workflow.status} -> ${args.status}`,
      );
    }

    const patch: {
      status: typeof args.status;
      updatedAt: number;
      output?: unknown;
      error?: string;
    } = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.output !== undefined) {
      patch.output = args.output;
    }

    if (args.error !== undefined) {
      patch.error = args.error;
    }

    await ctx.db.patch(workflow._id, patch);

    return workflow._id;
  },
});
