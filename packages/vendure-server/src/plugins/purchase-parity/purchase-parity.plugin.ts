/**
 * Purpose: Register creator-controlled purchase parity custom fields and GraphQL extensions.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 *   - docs/domain-model.md (§4.1 Product pricing)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/core-concepts/channels/
 * Tests:
 *   - packages/vendure-server/src/plugins/purchase-parity/purchase-parity.service.test.ts
 *   - packages/vendure-server/src/plugins/purchase-parity/purchase-parity.resolver.test.ts
 */
import { LanguageCode, PluginCommonModule, VendurePlugin } from '@vendure/core';
import type { RuntimeVendureConfig } from '@vendure/core';
import {
  purchaseParityAdminApiExtensions,
  purchaseParityShopApiExtensions,
  PurchaseParityAdminResolver,
  PurchaseParityShopResolver,
} from './purchase-parity.api.js';
import { PurchaseParityService, validateRegionalPricing } from './purchase-parity.service.js';

function purchaseParityConfiguration(config: RuntimeVendureConfig): RuntimeVendureConfig {
  config.customFields = {
    ...config.customFields,
    Product: [
      ...(config.customFields?.Product ?? []),
      {
        name: 'regionalPricingRules',
        type: 'struct',
        list: true,
        fields: [
          { name: 'region', type: 'string' },
          { name: 'discountPercent', type: 'int' },
        ],
        label: [{ languageCode: LanguageCode.en, value: 'Regional Pricing Rules' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'Creator-defined purchase parity rules layered on top of channel pricing.',
          },
        ],
        nullable: true,
        public: false,
        readonly: false,
        ui: { dashboard: false },
        validate: (value: unknown) => {
          if (!Array.isArray(value)) {
            return 'Regional pricing rules must be a list.';
          }
          const errors = value.flatMap((rule) => {
            if (typeof rule !== 'object' || rule === null) {
              return ['Regional pricing rules must be objects.'];
            }
            const record = rule as Record<string, unknown>;
            const validation = validateRegionalPricing({
              region: typeof record['region'] === 'string' ? record['region'] : '',
              discountPercent: Number(record['discountPercent']),
            });
            return validation.valid ? [] : validation.errors;
          });
          return errors.length > 0 ? errors[0] : undefined;
        },
      },
    ],
  };
  return config;
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [PurchaseParityService],
  configuration: purchaseParityConfiguration,
  adminApiExtensions: {
    schema: purchaseParityAdminApiExtensions,
    resolvers: [PurchaseParityAdminResolver],
  },
  shopApiExtensions: {
    schema: purchaseParityShopApiExtensions,
    resolvers: [PurchaseParityShopResolver],
  },
  compatibility: '^3.0.0',
})
export class PurchaseParityPlugin {}

export { purchaseParityConfiguration };
