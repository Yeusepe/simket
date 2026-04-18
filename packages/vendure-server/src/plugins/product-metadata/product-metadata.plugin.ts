/**
 * Purpose: ProductMetadataPlugin — extends Vendure Product with avatar/compatibility metadata.
 *
 * Adds custom fields:
 * - tryAvatarUrl: link to try/preview the avatar
 * - avatarRanking: 0-5 star ranking for the avatar
 * - compatibilityFlags: comma-separated list (vrcfury, poiyomi, unity, etc.)
 * - platformSupport: comma-separated platforms (unity, unreal, godot, blender)
 *
 * Governing docs:
 *   - docs/architecture.md §4.1 (Product entity)
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/custom-fields/
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 * Tests:
 *   - packages/vendure-server/src/plugins/product-metadata/product-metadata.service.test.ts
 */

import { PluginCommonModule, VendurePlugin, LanguageCode, Logger } from '@vendure/core';
import type { RuntimeVendureConfig } from '@vendure/core';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { validateTryAvatarUrl } from './product-metadata.service.js';

const loggerCtx = 'ProductMetadataPlugin';

/**
 * Applies product metadata custom fields to a Vendure config.
 * Exported separately for unit-testability.
 */
export function productMetadataConfiguration(
  config: RuntimeVendureConfig,
): RuntimeVendureConfig {
  config.customFields = {
    ...config.customFields,
    Product: [
      ...(config.customFields?.Product ?? []),
      {
        name: 'tryAvatarUrl',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Try Avatar URL' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'Link for buyers to try/preview the avatar before purchasing',
          },
        ],
        nullable: true,
        public: true,
        readonly: false,
        validate: validateTryAvatarUrl,
      },
      {
        name: 'avatarRanking',
        type: 'int',
        label: [{ languageCode: LanguageCode.en, value: 'Avatar Ranking' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'Star ranking for the avatar (0 = unranked, 1-5 stars)',
          },
        ],
        nullable: false,
        defaultValue: 0,
        public: true,
        readonly: false,
        min: 0,
        max: 5,
      },
      {
        name: 'compatibilityFlags',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Compatibility Flags' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value:
              'Comma-separated tool/feature compatibility flags (e.g., vrcfury,poiyomi,lilToon). Custom icons set by platform for common ones.',
          },
        ],
        nullable: true,
        public: true,
        readonly: false,
      },
      {
        name: 'platformSupport',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Platform Support' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value:
              'Comma-separated supported platforms (e.g., unity,unreal,godot,blender)',
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

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: productMetadataConfiguration,
})
export class ProductMetadataPlugin implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    Logger.info(
      'ProductMetadataPlugin initialized — avatar metadata and compatibility flags ready',
      loggerCtx,
    );
  }
}
