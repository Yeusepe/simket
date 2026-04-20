/**
 * Purpose: Register the Better Auth shop authentication strategy plus Simket's
 *          creator catalog/dashboard API extensions and custom fields.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/core-concepts/auth/
 * Tests:
 *   - packages/vendure-server/src/plugins/better-auth-bridge/better-auth-bridge.plugin.test.ts
 */
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { LanguageCode, Logger, PluginCommonModule, RequestContextService, VendurePlugin, type CustomFieldConfig, type RuntimeVendureConfig } from '@vendure/core';
import { BetterAuthBridgeResolver, betterAuthBridgeShopApiExtensions } from './better-auth-bridge.api.js';
import { CreatorCatalogService } from './better-auth-bridge.service.js';
import { BetterAuthAuthenticationStrategy } from './better-auth.strategy.js';

function appendUniqueCustomField(
  current: readonly CustomFieldConfig[] | undefined,
  field: CustomFieldConfig,
): readonly CustomFieldConfig[] {
  if (typeof field.name !== 'string') {
    return [...(current ?? []), field];
  }

  const filtered = (current ?? []).filter((entry) => entry.name !== field.name);
  return [...filtered, field];
}

export function betterAuthBridgeConfiguration(config: RuntimeVendureConfig): RuntimeVendureConfig {
  config.authOptions = {
    ...config.authOptions,
    shopAuthenticationStrategy: [
      ...(config.authOptions.shopAuthenticationStrategy ?? []),
      new BetterAuthAuthenticationStrategy(),
    ],
  };

  const customerFields = appendUniqueCustomField(
    appendUniqueCustomField(
      appendUniqueCustomField(
        appendUniqueCustomField(config.customFields?.Customer, {
          name: 'betterAuthUserId',
          type: 'string',
          public: false,
          nullable: true,
        }),
        {
          name: 'betterAuthRole',
          type: 'string',
          public: true,
          nullable: true,
        },
      ),
      {
        name: 'creatorSlug',
        type: 'string',
        public: true,
        nullable: true,
      },
    ),
    {
      name: 'avatarUrl',
      type: 'string',
      public: true,
      nullable: true,
    },
  );

  const productFields = [
    { name: 'seedKey', type: 'string', public: false, nullable: true },
    { name: 'betterAuthUserId', type: 'string', public: false, nullable: true },
    { name: 'creatorName', type: 'string', public: true, nullable: true },
    { name: 'creatorSlug', type: 'string', public: true, nullable: true },
    { name: 'creatorAvatarUrl', type: 'string', public: true, nullable: true },
    { name: 'shortDescription', type: 'text', public: true, nullable: true },
    { name: 'listingVisibility', type: 'string', public: true, nullable: false, defaultValue: 'draft' },
    { name: 'tagsJson', type: 'text', public: true, nullable: true },
    { name: 'heroImageUrl', type: 'string', public: true, nullable: true },
    { name: 'heroTransparentUrl', type: 'string', public: true, nullable: true },
    { name: 'heroBackgroundUrl', type: 'string', public: true, nullable: true },
    { name: 'previewColor', type: 'string', public: true, nullable: true },
    { name: 'salesCount', type: 'int', public: true, nullable: false, defaultValue: 0 },
    { name: 'revenueMinor', type: 'int', public: true, nullable: false, defaultValue: 0 },
    { name: 'viewCount', type: 'int', public: true, nullable: false, defaultValue: 0 },
    { name: 'priceMin', type: 'int', public: true, nullable: false, defaultValue: 0 },
    { name: 'priceMax', type: 'int', public: true, nullable: false, defaultValue: 0 },
  ] satisfies CustomFieldConfig[];

  const nextProductFields = productFields.reduce<readonly CustomFieldConfig[]>(
    (current, field) => appendUniqueCustomField(current, field),
    config.customFields?.Product ?? [],
  );

  config.customFields = {
    ...config.customFields,
    Customer: [...customerFields],
    Product: [...nextProductFields],
  };

  return config;
}

const loggerCtx = 'BetterAuthBridgePlugin';

@Injectable()
export class BetterAuthBridgeBootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly creatorCatalogService: CreatorCatalogService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env['NODE_ENV'] === 'production') {
      return;
    }

    const ctx = await this.requestContextService.create({
      apiType: 'admin',
      languageCode: LanguageCode.en,
    });

    await this.creatorCatalogService.primeDevelopmentSeeds(ctx);
    Logger.info('Development Better Auth accounts and creator products are seeded.', loggerCtx);
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [CreatorCatalogService, BetterAuthBridgeBootstrapService],
  configuration: betterAuthBridgeConfiguration,
  shopApiExtensions: {
    schema: betterAuthBridgeShopApiExtensions,
    resolvers: [BetterAuthBridgeResolver],
  },
  compatibility: '^3.0.0',
})
export class BetterAuthBridgePlugin {}
