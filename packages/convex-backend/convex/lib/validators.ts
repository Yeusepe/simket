/**
 * Purpose: Pure validation helpers for Convex workflow and notification state.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.convex.dev/
 *   - https://docs.convex.dev/database/schemas
 * Tests:
 *   - packages/convex-backend/src/validators.test.ts
 */

export const WORKFLOW_TYPES = [
  'checkout',
  'asset_processing',
  'payout',
  'collaboration_setup',
] as const;

export const WORKFLOW_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;

export const NOTIFICATION_TYPES = [
  'order.completed',
  'collaboration.invited',
  'collaboration.accepted',
  'product.published',
  'review.received',
  'payout.sent',
] as const;

export type WorkflowType = (typeof WORKFLOW_TYPES)[number];
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const allowedWorkflowTransitions: Readonly<
  Record<WorkflowStatus, readonly WorkflowStatus[]>
> = {
  pending: ['running', 'cancelled'],
  running: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

const notificationTypeSet = new Set<string>(NOTIFICATION_TYPES);

export function validateWorkflowTransition(
  from: WorkflowStatus,
  to: WorkflowStatus,
): boolean {
  return allowedWorkflowTransitions[from].includes(to);
}

export function buildWorkflowId(
  type: WorkflowType,
  entityId: string,
): string {
  const normalizedEntityId = entityId.trim();
  if (normalizedEntityId.length === 0) {
    throw new Error('entityId must be a non-empty string');
  }

  return `${type}_${normalizedEntityId}`;
}

export function validateNotificationType(
  type: string,
): type is NotificationType {
  return notificationTypeSet.has(type);
}
