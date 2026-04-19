/**
 * Purpose: EmailNotificationsPlugin — Vendure plugin that listens to lifecycle events
 * and enqueues transactional email dispatch via a job queue.
 *
 * Governing docs:
 *   - docs/architecture.md §12 (Notifications)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/events/
 *   - https://docs.vendure.io/guides/developer-guide/worker-job-queue/
 * Tests:
 *   - packages/vendure-server/src/plugins/email-notifications/email-event-subscriber.test.ts
 *   - packages/vendure-server/src/plugins/email-notifications/email-notifications.service.test.ts
 */

import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { EmailEventSubscriber } from './email-event-subscriber.js';

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [EmailEventSubscriber],
})
export class EmailNotificationsPlugin {}
