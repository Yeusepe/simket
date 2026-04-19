/**
 * Purpose: Register the standalone order settlement plugin's persistence and admin GraphQL API.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §1.13 Hyperswitch)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/settlement/settlement.service.test.ts
 *   - packages/vendure-server/src/plugins/settlement/settlement.resolver.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { SettlementAdminResolver, settlementAdminApiExtensions } from './settlement.api.js';
import { OrderSettlementEntity } from './settlement.entity.js';
import { SettlementService } from './settlement.service.js';

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [OrderSettlementEntity],
  providers: [SettlementService],
  adminApiExtensions: {
    schema: settlementAdminApiExtensions,
    resolvers: [SettlementAdminResolver],
  },
  compatibility: '^3.0.0',
})
export class SettlementPlugin {}
