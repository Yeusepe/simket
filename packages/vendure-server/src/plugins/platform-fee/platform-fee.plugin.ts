/**
 * Purpose: Register platform fee GraphQL extensions and persistence service.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/platform-fee/platform-fee.service.test.ts
 *   - packages/vendure-server/src/plugins/platform-fee/platform-fee.resolver.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import {
  platformFeeAdminApiExtensions,
  platformFeeShopApiExtensions,
  PlatformFeeAdminResolver,
  PlatformFeeShopResolver,
} from './platform-fee.api.js';
import { PlatformFeeService } from './platform-fee.service.js';

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [PlatformFeeService],
  adminApiExtensions: {
    schema: platformFeeAdminApiExtensions,
    resolvers: [PlatformFeeAdminResolver],
  },
  shopApiExtensions: {
    schema: platformFeeShopApiExtensions,
    resolvers: [PlatformFeeShopResolver],
  },
  compatibility: '^3.0.0',
})
export class PlatformFeePlugin {}
