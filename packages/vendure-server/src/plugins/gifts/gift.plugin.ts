/**
 * Purpose: GiftPlugin — Vendure plugin for gift purchases and claims.
 *
 * Governing docs:
 *   - docs/architecture.md §4.3 (Orders and entitlements)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 * Tests:
 *   - packages/vendure-server/src/plugins/gifts/gift.service.test.ts
 */

import { PluginCommonModule, VendurePlugin, Logger } from '@vendure/core';
import type { OnApplicationBootstrap } from '@nestjs/common';

const loggerCtx = 'GiftPlugin';

@VendurePlugin({
  imports: [PluginCommonModule],
})
export class GiftPlugin implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    Logger.info('GiftPlugin initialized — gift codes and claiming ready', loggerCtx);
  }
}
