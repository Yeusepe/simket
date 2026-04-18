import {
  PluginCommonModule,
  VendurePlugin,
  EventBus,
  ProductEvent,
  ProductService,
  RequestContext,
  LanguageCode,
  Logger,
} from '@vendure/core';
import type { RuntimeVendureConfig } from '@vendure/core';
import type { OnApplicationBootstrap } from '@nestjs/common';

const loggerCtx = 'CatalogPlugin';

/**
 * Minimum platform take rate (5%).
 * Creators can set a higher value to get better algorithmic boost.
 */
const MIN_TAKE_RATE = 5;
const MAX_TAKE_RATE = 100;

/**
 * Validates a platform take rate value.
 * Returns an error string if invalid, or undefined if valid.
 */
function validateTakeRate(value: number): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'platformTakeRate must be a finite number';
  }
  if (value < MIN_TAKE_RATE) {
    return `platformTakeRate must be at least ${MIN_TAKE_RATE}%`;
  }
  if (value > MAX_TAKE_RATE) {
    return `platformTakeRate must be at most ${MAX_TAKE_RATE}%`;
  }
  return undefined;
}

/**
 * Applies CatalogPlugin custom fields to a Vendure config.
 * Exported separately for unit-testability without bootstrapping Vendure.
 */
function catalogConfiguration(config: RuntimeVendureConfig): RuntimeVendureConfig {
  config.customFields = {
    ...config.customFields,
    Product: [
      ...(config.customFields?.Product ?? []),
      {
        name: 'tiptapDescription',
        type: 'text',
        label: [{ languageCode: LanguageCode.en, value: 'TipTap Description' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'Rich text description as TipTap JSON document',
          },
        ],
        nullable: true,
        public: true,
        readonly: false,
      },
      {
        name: 'termsOfService',
        type: 'text',
        label: [{ languageCode: LanguageCode.en, value: 'Terms of Service' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'Terms of service as TipTap JSON document',
          },
        ],
        nullable: true,
        public: true,
        readonly: false,
      },
      {
        name: 'heroAssetId',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Hero Asset ID' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'CDNgine asset ID for main hero image/video/gif/webp',
          },
        ],
        nullable: true,
        public: true,
        readonly: false,
      },
      {
        name: 'heroTransparentAssetId',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Hero Transparent Asset ID' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value:
              'CDNgine asset ID for transparent product overlay (required for editorial)',
          },
        ],
        nullable: true,
        public: true,
        readonly: false,
      },
      {
        name: 'heroBackgroundAssetId',
        type: 'string',
        label: [{ languageCode: LanguageCode.en, value: 'Hero Background Asset ID' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'CDNgine asset ID for hero background image',
          },
        ],
        nullable: true,
        public: true,
        readonly: false,
      },
      {
        name: 'platformTakeRate',
        type: 'int',
        label: [{ languageCode: LanguageCode.en, value: 'Platform Take Rate (%)' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: `Percentage the platform takes per sale (min ${MIN_TAKE_RATE}%). Higher values boost recommendation visibility.`,
          },
        ],
        nullable: false,
        defaultValue: MIN_TAKE_RATE,
        public: true,
        readonly: false,
        min: MIN_TAKE_RATE,
        max: MAX_TAKE_RATE,
        validate: validateTakeRate,
      },
    ],
  };
  return config;
}

/**
 * CatalogPlugin — extends Vendure's Product entity with Simket-specific fields:
 *
 * - tiptapDescription: JSONB storing TipTap document JSON
 * - termsOfService:    JSONB storing TipTap TOS document
 * - heroAssetId:       CDNgine asset ID for the main hero image/video
 * - heroTransparentAssetId: CDNgine asset ID for transparent hero overlay
 * - heroBackgroundAssetId:  CDNgine asset ID for hero background
 * - platformTakeRate:  Percentage the platform takes (min 5%)
 *
 * Uses Vendure's built-in ProductEvent for lifecycle hooks.
 *
 * @see https://docs.vendure.io/guides/developer-guide/custom-fields/
 * @see https://docs.vendure.io/guides/developer-guide/plugins/
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: catalogConfiguration,
})
export class CatalogPlugin implements OnApplicationBootstrap {
  constructor(
    private eventBus: EventBus,
    private productService: ProductService,
  ) {}

  onApplicationBootstrap() {
    // Log product lifecycle events for observability
    this.eventBus.ofType(ProductEvent).subscribe((event) => {
      Logger.info(
        `ProductEvent [${event.type}]: product=${event.entity.id}`,
        loggerCtx,
      );
    });
  }
}

export { MIN_TAKE_RATE, MAX_TAKE_RATE, validateTakeRate, catalogConfiguration };
