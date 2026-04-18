/**
 * Purpose: Svix feature barrel for the webhook delivery service and types.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership)
 *   - docs/service-architecture.md (§1.7 Svix)
 * External references:
 *   - https://docs.svix.com/
 *   - packages/vendure-server/node_modules/svix/dist/index.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/svix/svix.service.test.ts
 */

export { SvixService, buildAppId, validateEventType, validateWebhookUrl } from './svix.service.js';
export type { SendEventParams, SimketEventType, WebhookConfig } from './svix.types.js';
