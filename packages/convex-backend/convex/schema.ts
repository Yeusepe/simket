/**
 * Purpose: Convex data model for user preferences, notifications, workflow
 * state, and creator dashboard statistics.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.convex.dev/database/schemas
 * Tests:
 *   - packages/convex-backend/src/validators.test.ts
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  userPreferences: defineTable({
    userId: v.string(),
    theme: v.union(
      v.literal('light'),
      v.literal('dark'),
      v.literal('system'),
    ),
    emailNotifications: v.boolean(),
    pushNotifications: v.boolean(),
    locale: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  notifications: defineTable({
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
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_userId_read', ['userId', 'read'])
    .index('by_userId_createdAt', ['userId', 'createdAt']),

  workflows: defineTable({
    workflowId: v.string(),
    type: v.union(
      v.literal('checkout'),
      v.literal('asset_processing'),
      v.literal('payout'),
      v.literal('collaboration_setup'),
    ),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled'),
    ),
    entityId: v.string(),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_workflowId', ['workflowId'])
    .index('by_type_status', ['type', 'status']),

  creatorStats: defineTable({
    creatorId: v.string(),
    totalSales: v.number(),
    totalRevenue: v.number(),
    productCount: v.number(),
    averageRating: v.number(),
    updatedAt: v.number(),
  }).index('by_creatorId', ['creatorId']),
});
