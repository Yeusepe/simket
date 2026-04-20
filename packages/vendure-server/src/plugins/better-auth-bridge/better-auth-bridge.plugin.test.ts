import { describe, it, expect, vi, afterEach } from 'vitest';
import type { RuntimeVendureConfig, RequestContextService } from '@vendure/core';
import { BetterAuthBridgeBootstrapService, betterAuthBridgeConfiguration } from './better-auth-bridge.plugin.js';
import type { CreatorCatalogService } from './better-auth-bridge.service.js';

afterEach(() => {
  delete process.env['NODE_ENV'];
  vi.restoreAllMocks();
});

function applyPluginConfig(existingProductFields: unknown[] = []) {
  const baseConfig = {
    authOptions: {
      shopAuthenticationStrategy: [],
    },
    customFields: {
      Product: existingProductFields,
      Customer: [],
    },
  } as RuntimeVendureConfig;

  return betterAuthBridgeConfiguration(baseConfig);
}

describe('BetterAuthBridgePlugin', () => {
  it('registers the better_auth strategy and custom product fields', () => {
    const configured = applyPluginConfig([{ name: 'existingField', type: 'string' }]);

    expect(configured.authOptions.shopAuthenticationStrategy).toHaveLength(1);
    expect(configured.authOptions.shopAuthenticationStrategy?.[0]?.name).toBe('better_auth');

    const productFields = configured.customFields?.Product ?? [];
    expect(productFields.some((field) => field.name === 'existingField')).toBe(true);
    expect(productFields.some((field) => field.name === 'seedKey')).toBe(true);
    expect(productFields.some((field) => field.name === 'betterAuthUserId')).toBe(true);
  });

  it('primes Better Auth development seeds on bootstrap outside production', async () => {
    const ctx = { apiType: 'admin' };
    const create = vi.fn().mockResolvedValue(ctx);
    const primeDevelopmentSeeds = vi.fn().mockResolvedValue(undefined);

    const bootstrapService = new BetterAuthBridgeBootstrapService(
      { create } as unknown as RequestContextService,
      { primeDevelopmentSeeds } as unknown as CreatorCatalogService,
    );

    await bootstrapService.onApplicationBootstrap();

    expect(create).toHaveBeenCalledWith({
      apiType: 'admin',
      languageCode: 'en',
    });
    expect(primeDevelopmentSeeds).toHaveBeenCalledWith(ctx);
  });

  it('skips bootstrap seeding in production', async () => {
    process.env['NODE_ENV'] = 'production';
    const create = vi.fn();
    const primeDevelopmentSeeds = vi.fn();

    const bootstrapService = new BetterAuthBridgeBootstrapService(
      { create } as unknown as RequestContextService,
      { primeDevelopmentSeeds } as unknown as CreatorCatalogService,
    );

    await bootstrapService.onApplicationBootstrap();

    expect(create).not.toHaveBeenCalled();
    expect(primeDevelopmentSeeds).not.toHaveBeenCalled();
  });
});
