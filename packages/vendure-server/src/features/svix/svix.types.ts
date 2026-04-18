/**
 * Purpose: Svix webhook integration types for Simket event delivery.
 * Governing docs:
 *   - docs/architecture.md (§4 System boundary, §5 Service ownership)
 *   - docs/service-architecture.md (§1.7 Svix)
 *   - docs/domain-model.md (§1 Core records, WebhookEndpoint)
 * External references:
 *   - https://docs.svix.com/
 *   - https://api.svix.com/
 *   - packages/vendure-server/node_modules/svix/dist/models/messageIn.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/svix/svix.service.test.ts
 */

export type SimketEventType =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'order.completed'
  | 'order.refunded'
  | 'collaboration.invited'
  | 'collaboration.accepted'
  | 'collaboration.revoked'
  | 'asset.processed'
  | 'asset.failed';

export interface WebhookConfig {
  readonly svixApiKey: string;
  readonly svixAppPortalUrl?: string;
}

export interface SendEventParams {
  readonly eventType: SimketEventType;
  readonly payload: Record<string, unknown>;
  readonly creatorId: string;
  readonly idempotencyKey?: string;
}
