/**
 * Purpose: Register checkout services and shop API extensions for SQL-backed checkout flows.
 * Governing docs:
 *   - docs/architecture.md (§2 checkout reads skip cache, §5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §1.13 Hyperswitch)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/checkout/checkout.service.test.ts
 *   - packages/vendure-server/src/plugins/checkout/checkout.resolver.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { checkoutShopApiExtensions, CheckoutResolver } from './checkout.api.js';
import { CheckoutService } from './checkout.service.js';

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [CheckoutService],
  shopApiExtensions: {
    schema: checkoutShopApiExtensions,
    resolvers: [CheckoutResolver],
  },
  compatibility: '^3.0.0',
})
export class CheckoutPlugin {}
