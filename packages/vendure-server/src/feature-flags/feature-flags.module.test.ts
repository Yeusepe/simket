/**
 * Purpose: Verify OpenFeature bootstrap wiring for default and custom flag configuration.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://openfeature.dev/docs/reference/sdks/server/javascript/
 * Tests:
 *   - packages/vendure-server/src/feature-flags/feature-flags.module.test.ts
 */
import { afterEach, describe, expect, it } from 'vitest';
import { OpenFeature } from '@openfeature/server-sdk';
import {
  DEFAULT_FLAG_CONFIGURATION,
  type FlagConfiguration,
} from '../features/feature-flags.js';
import {
  FEATURE_FLAG_CONFIGURATION,
  FeatureFlagsBootstrapService,
  FeatureFlagsModule,
} from './feature-flags.module.js';

afterEach(async () => {
  await OpenFeature.close();
});

describe('FeatureFlagsBootstrapService', () => {
  it('registers the default feature flags on bootstrap', async () => {
    const service = new FeatureFlagsBootstrapService(DEFAULT_FLAG_CONFIGURATION);

    await service.onApplicationBootstrap();

    const client = OpenFeature.getClient();
    await expect(client.getBooleanValue('recommendation-boost', true)).resolves.toBe(false);
    await expect(client.getBooleanValue('new-checkout-flow', true)).resolves.toBe(false);
    await expect(client.getNumberValue('max-bundle-size', 0)).resolves.toBe(10);
  });

  it('closes OpenFeature on shutdown', async () => {
    const service = new FeatureFlagsBootstrapService(DEFAULT_FLAG_CONFIGURATION);

    await service.onApplicationBootstrap();
    await expect(service.onApplicationShutdown()).resolves.toBeUndefined();
  });
});

describe('FeatureFlagsModule', () => {
  it('exposes the provided configuration through forRoot()', () => {
    const customConfiguration: FlagConfiguration = {
      'recommendation-boost': {
        variants: { on: true, off: false },
        defaultVariant: 'on',
        disabled: false,
      },
    };

    const moduleDefinition = FeatureFlagsModule.forRoot(customConfiguration);
    const configurationProvider = moduleDefinition.providers?.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === FEATURE_FLAG_CONFIGURATION,
    );

    expect(configurationProvider).toMatchObject({
      provide: FEATURE_FLAG_CONFIGURATION,
      useValue: customConfiguration,
    });
  });
});
