/**
 * Purpose: Register in-app notification persistence and shop API extensions.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/domain-model.md (§1 core records)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/notification/notification.service.test.ts
 *   - packages/vendure-server/src/plugins/notification/notification.resolver.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { NotificationEntity } from './notification.entity.js';
import { notificationShopApiExtensions } from './notification.api.js';
import { NotificationResolver } from './notification.resolver.js';
import { NotificationService } from './notification.service.js';

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [NotificationEntity],
  providers: [NotificationService],
  shopApiExtensions: {
    schema: notificationShopApiExtensions,
    resolvers: [NotificationResolver],
  },
  compatibility: '^3.0.0',
})
export class NotificationPlugin {}
