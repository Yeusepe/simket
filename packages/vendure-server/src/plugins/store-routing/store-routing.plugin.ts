/**
 * Purpose: StoreRoutingPlugin — Vendure plugin that registers subdomain routing middleware.
 *
 * Governing docs:
 *   - docs/architecture.md §5 (Page Builder — Framely, subdomain routing)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/#middleware
 * Tests:
 *   - packages/vendure-server/src/plugins/store-routing/store-routing.service.test.ts
 *   - packages/vendure-server/src/plugins/store-routing/store-routing.middleware.test.ts
 */
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { StoreRoutingMiddleware } from './store-routing.middleware.js';

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [StoreRoutingMiddleware],
})
export class StoreRoutingPlugin implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(StoreRoutingMiddleware).forRoutes('*');
  }
}
