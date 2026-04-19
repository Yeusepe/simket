/**
 * Purpose: Register AB testing persistence, OpenFeature-backed evaluation, and GraphQL API extensions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/ab-testing/ab-testing.service.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import {
  AbTestingAdminResolver,
  AbTestingShopResolver,
  abTestingAdminApiExtensions,
  abTestingShopApiExtensions,
} from './ab-testing.api.js';
import { AbTestingService } from './ab-testing.service.js';
import { ExperimentEntity, ExperimentResultEntity } from './experiment.entity.js';

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [ExperimentEntity, ExperimentResultEntity],
  providers: [AbTestingService],
  adminApiExtensions: {
    schema: abTestingAdminApiExtensions,
    resolvers: [AbTestingAdminResolver],
  },
  shopApiExtensions: {
    schema: abTestingShopApiExtensions,
    resolvers: [AbTestingShopResolver],
  },
  compatibility: '^3.0.0',
})
export class AbTestingPlugin {}
