/**
 * Purpose: ReportingPlugin — Vendure plugin for content reporting and moderation.
 *
 * Governing docs:
 *   - docs/architecture.md §10 (Trust & Safety)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 * Tests:
 *   - packages/vendure-server/src/plugins/reporting/reporting.service.test.ts
 */

import { PluginCommonModule, VendurePlugin, Logger } from '@vendure/core';
import type { OnApplicationBootstrap } from '@nestjs/common';

const loggerCtx = 'ReportingPlugin';

@VendurePlugin({
  imports: [PluginCommonModule],
})
export class ReportingPlugin implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    Logger.info('ReportingPlugin initialized — content reporting and moderation ready', loggerCtx);
  }
}
