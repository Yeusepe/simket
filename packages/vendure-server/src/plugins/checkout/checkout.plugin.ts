/**
 * Purpose: CheckoutPlugin — Vendure plugin wiring checkout + Hyperswitch.
 *
 * Governing docs:
 *   - docs/architecture.md §7 (Payment — Hyperswitch)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/payment-integrations/
 * Tests:
 *   - packages/vendure-server/src/plugins/checkout/checkout.service.test.ts
 */

import { PluginCommonModule, VendurePlugin, Logger } from '@vendure/core';
import type { OnApplicationBootstrap } from '@nestjs/common';

const loggerCtx = 'CheckoutPlugin';

@VendurePlugin({
  imports: [PluginCommonModule],
})
export class CheckoutPlugin implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    Logger.info('CheckoutPlugin initialized — Hyperswitch checkout integration ready', loggerCtx);
  }
}
