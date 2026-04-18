/**
 * Purpose: PaymentWebhookPlugin — Vendure plugin for Hyperswitch webhook processing.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 * External references:
 *   - https://docs.hyperswitch.io/explore-hyperswitch/webhooks
 * Tests:
 *   - packages/vendure-server/src/plugins/payment-webhook/payment-webhook.service.test.ts
 */

import { PluginCommonModule, VendurePlugin, Logger } from '@vendure/core';
import type { OnApplicationBootstrap } from '@nestjs/common';

const loggerCtx = 'PaymentWebhookPlugin';

@VendurePlugin({
  imports: [PluginCommonModule],
})
export class PaymentWebhookPlugin implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    Logger.info('PaymentWebhookPlugin initialized — Hyperswitch webhook handler ready', loggerCtx);
  }
}
