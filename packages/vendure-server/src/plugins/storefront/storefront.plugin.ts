/**
 * Purpose: StorefrontPlugin — registers StorePageEntity and pure helpers for storefront page logic.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership, Storefront plugin)
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/storefront.plugin.test.ts
 */
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import type { RuntimeVendureConfig } from '@vendure/core';
import { storefrontShopApiExtensions } from './storefront.api.js';
import { StorePageEntity } from './storefront.entity.js';
import {
  duplicatePage,
  filterPagesByScope,
  isPageVisibleToUser,
  isStorePageScope,
  sortPages,
  STORE_PAGE_SLUG_PATTERN,
  validateStorePage,
} from './storefront.shared.js';
import { templateAdminApiExtensions } from './template.api.js';
import { TemplateEntity } from './template.entity.js';
import { TemplateResolver } from './template.resolver.js';
import { templateJsonScalar } from './template.scalar.js';
import { StorefrontPageResolver } from './storefront.resolver.js';
import { StorefrontPageService } from './storefront.service.js';
import { TemplateService } from './template.service.js';

function storefrontConfiguration(config: RuntimeVendureConfig): RuntimeVendureConfig {
  return config;
}

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [StorePageEntity, TemplateEntity],
  providers: [TemplateService, StorefrontPageService],
  adminApiExtensions: {
    schema: templateAdminApiExtensions,
    resolvers: [TemplateResolver],
    scalars: {
      JSON: templateJsonScalar,
    },
  },
  shopApiExtensions: {
    schema: storefrontShopApiExtensions,
    resolvers: [StorefrontPageResolver],
    scalars: {
      JSON: templateJsonScalar,
    },
  },
  configuration: storefrontConfiguration,
  compatibility: '^3.0.0',
})
export class StorefrontPlugin {}

export {
  TemplateEntity,
  STORE_PAGE_SLUG_PATTERN,
  storefrontConfiguration,
  validateStorePage,
  isPageVisibleToUser,
  sortPages,
  filterPagesByScope,
  duplicatePage,
  isStorePageScope,
};
