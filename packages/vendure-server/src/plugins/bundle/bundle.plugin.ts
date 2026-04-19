/**
 * Purpose: BundlePlugin — groups multiple products into discounted bundles.
 * Governing docs:
 *   - docs/architecture.md (§4 Product model)
 *   - docs/domain-model.md (Bundle entity)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/custom-fields/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 * Tests:
 *   - packages/vendure-server/src/plugins/bundle/bundle.plugin.test.ts
 */
import { PluginCommonModule, VendurePlugin, LanguageCode } from '@vendure/core';
import type { RuntimeVendureConfig } from '@vendure/core';
import {
  bundleAdminApiExtensions,
  bundleShopApiExtensions,
  BundleAdminResolver,
  BundleShopResolver,
} from './bundle.api.js';
import { BundleEntity } from './bundle.entity.js';
import { BundleService } from './bundle.service.js';

/**
 * Applies BundlePlugin configuration to the Vendure config.
 * Adds a `bundleIds` custom field to Product so products can reference which bundles they belong to.
 * Exported separately for unit-testability without bootstrapping Vendure.
 */
function bundleConfiguration(config: RuntimeVendureConfig): RuntimeVendureConfig {
  config.customFields = {
    ...config.customFields,
    Product: [
      ...(config.customFields?.Product ?? []),
      {
        name: 'bundleIds',
        type: 'string',
        list: true,
        label: [{ languageCode: LanguageCode.en, value: 'Bundle IDs' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'IDs of bundles this product belongs to',
          },
        ],
        nullable: true,
        public: true,
        readonly: false,
      },
    ],
  };
  return config;
}

/**
 * BundlePlugin — enables grouping multiple products into discounted bundles.
 *
 * Registers the {@link BundleEntity} and adds a `bundleIds` custom field to Product.
 *
 * @see https://docs.vendure.io/guides/developer-guide/plugins/
 * @see https://docs.vendure.io/guides/developer-guide/database-entity/
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [BundleEntity],
  providers: [BundleService],
  adminApiExtensions: {
    schema: bundleAdminApiExtensions,
    resolvers: [BundleAdminResolver],
  },
  shopApiExtensions: {
    schema: bundleShopApiExtensions,
    resolvers: [BundleShopResolver],
  },
  configuration: bundleConfiguration,
  compatibility: '^3.0.0',
})
export class BundlePlugin {}

export { bundleConfiguration };
export {
  allocateBundleLinePricing,
  calculateBundlePrice,
  MAX_DISCOUNT,
  MIN_DISCOUNT,
  validateDiscountPercent,
} from './bundle.service.js';
export type { BundleCartPricing, BundleLinePricing, BundleLinePricingInput } from './bundle.service.js';
