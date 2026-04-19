/**
 * Purpose: Register global OpenFeature defaults for Vendure request handling.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://openfeature.dev/docs/reference/sdks/server/javascript/
 * Tests:
 *   - packages/vendure-server/src/feature-flags/feature-flags.module.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { FeatureFlagsModule } from './feature-flags.module.js';

@VendurePlugin({
  imports: [PluginCommonModule, FeatureFlagsModule.forRoot()],
  compatibility: '^3.0.0',
})
export class FeatureFlagsPlugin {}
