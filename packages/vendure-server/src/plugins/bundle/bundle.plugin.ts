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
import { BundleEntity } from './bundle.entity.js';

const MIN_DISCOUNT = 0;
const MAX_DISCOUNT = 100;

/**
 * Validates that a discount percentage is a finite number in the [0, 100] range.
 * Returns an error string if invalid, or undefined if valid.
 */
function validateDiscountPercent(value: number): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'discountPercent must be a finite number';
  }
  if (value < MIN_DISCOUNT) {
    return `discountPercent must be at least ${MIN_DISCOUNT}%`;
  }
  if (value > MAX_DISCOUNT) {
    return `discountPercent must be at most ${MAX_DISCOUNT}%`;
  }
  return undefined;
}

/**
 * Calculates the total bundle price after applying a discount.
 * @param prices - Array of individual product prices (in minor units, e.g. cents).
 * @param discountPercent - Discount percentage to apply (0–100).
 * @returns The discounted total, rounded to the nearest integer.
 */
function calculateBundlePrice(prices: number[], discountPercent: number): number {
  const total = prices.reduce((sum, p) => sum + p, 0);
  const discounted = total * (1 - discountPercent / 100);
  return Math.round(discounted);
}

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
  configuration: bundleConfiguration,
  compatibility: '^3.0.0',
})
export class BundlePlugin {}

export {
  bundleConfiguration,
  validateDiscountPercent,
  calculateBundlePrice,
  MIN_DISCOUNT,
  MAX_DISCOUNT,
};
