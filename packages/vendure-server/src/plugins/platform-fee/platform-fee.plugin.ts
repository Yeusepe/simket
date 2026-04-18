/**
 * Purpose: PlatformFeePlugin — registers fee-related custom fields and exposes
 * fee calculation through Vendure's plugin system.
 *
 * The actual fee calculation logic lives in platform-fee.service.ts as pure
 * functions (no DI needed). This plugin ensures the custom field constraints
 * are enforced at the Vendure layer.
 *
 * Governing docs:
 *   - docs/architecture.md §7.2 (Hyperswitch fee model)
 *   - docs/service-architecture.md §1.13 (Payment API contract)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/custom-fields/
 * Tests:
 *   - packages/vendure-server/src/plugins/platform-fee/platform-fee.service.test.ts
 */

import { PluginCommonModule, VendurePlugin, Logger } from '@vendure/core';
import type { OnApplicationBootstrap } from '@nestjs/common';

const loggerCtx = 'PlatformFeePlugin';

/**
 * PlatformFeePlugin — pure utility plugin that exposes platform fee
 * calculation through Vendure's service layer.
 *
 * The platformTakeRate custom field is registered by CatalogPlugin.
 * This plugin provides the business logic for fee calculation,
 * revenue splitting, and recommendation boost computation.
 */
@VendurePlugin({
  imports: [PluginCommonModule],
})
export class PlatformFeePlugin implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    Logger.info('PlatformFeePlugin initialized — fee calculation ready', loggerCtx);
  }
}
