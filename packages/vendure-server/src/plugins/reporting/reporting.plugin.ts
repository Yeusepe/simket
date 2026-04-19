/**
 * Purpose: ReportingPlugin — Vendure plugin for content reporting and moderation.
 *
 * Governing docs:
 *   - docs/architecture.md §5 (Service ownership)
 *   - docs/service-architecture.md §1.1 (Vendure gateway)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/reporting/reporting.service.test.ts
 *   - packages/vendure-server/src/plugins/reporting/reporting.resolver.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import {
  ReportingAdminResolver,
  ReportingShopResolver,
  reportingAdminApiExtensions,
  reportingShopApiExtensions,
} from './reporting.api.js';
import { ReportEntity } from './reporting.entity.js';
import { ReportingService } from './reporting.service.js';

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [ReportEntity],
  providers: [ReportingService],
  adminApiExtensions: {
    schema: reportingAdminApiExtensions,
    resolvers: [ReportingAdminResolver],
  },
  shopApiExtensions: {
    schema: reportingShopApiExtensions,
    resolvers: [ReportingShopResolver],
  },
  compatibility: '^3.0.0',
})
export class ReportingPlugin {}
