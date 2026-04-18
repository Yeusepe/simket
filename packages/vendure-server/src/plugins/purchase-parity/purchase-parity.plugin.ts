/**
 * Purpose: PurchaseParityPlugin — Vendure plugin for regional pricing.
 *
 * Governing docs:
 *   - docs/architecture.md §7.2 (Hyperswitch fee model — regional pricing)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 * Tests:
 *   - packages/vendure-server/src/plugins/purchase-parity/purchase-parity.service.test.ts
 */

import { PluginCommonModule, VendurePlugin, Logger } from '@vendure/core';
import type { OnApplicationBootstrap } from '@nestjs/common';

const loggerCtx = 'PurchaseParityPlugin';

/**
 * PurchaseParityPlugin — provides regional pricing (purchase parity) for products.
 *
 * Creators can set per-region or per-country discount percentages so buyers in
 * lower-income regions pay less. Discount resolution happens at checkout time
 * using pure functions from purchase-parity.service.ts.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
})
export class PurchaseParityPlugin implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    Logger.info('PurchaseParityPlugin initialized — regional pricing ready', loggerCtx);
  }
}
