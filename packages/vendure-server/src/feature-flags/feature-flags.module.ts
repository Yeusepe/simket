/**
 * Purpose: Nest module that initializes the OpenFeature provider during Vendure bootstrap.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://openfeature.dev/docs/reference/sdks/server/javascript/
 *   - https://docs.nestjs.com/modules
 * Tests:
 *   - packages/vendure-server/src/feature-flags/feature-flags.module.test.ts
 */
import {
  Inject,
  Injectable,
  Module,
  type DynamicModule,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { OpenFeature } from '@openfeature/server-sdk';
import {
  DEFAULT_FLAG_CONFIGURATION,
  createDefaultFeatureFlagProvider,
  initFeatureFlags,
  type FlagConfiguration,
} from '../features/feature-flags.js';

export const FEATURE_FLAG_CONFIGURATION = Symbol('FEATURE_FLAG_CONFIGURATION');

@Injectable()
export class FeatureFlagsBootstrapService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(
    @Inject(FEATURE_FLAG_CONFIGURATION)
    private readonly flagConfiguration: FlagConfiguration,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await initFeatureFlags(createDefaultFeatureFlagProvider(this.flagConfiguration));
  }

  async onApplicationShutdown(): Promise<void> {
    await OpenFeature.close();
  }
}

@Module({})
export class FeatureFlagsModule {
  static forRoot(
    flagConfiguration: FlagConfiguration = DEFAULT_FLAG_CONFIGURATION,
  ): DynamicModule {
    return {
      module: FeatureFlagsModule,
      providers: [
        {
          provide: FEATURE_FLAG_CONFIGURATION,
          useValue: flagConfiguration,
        },
        FeatureFlagsBootstrapService,
      ],
      exports: [FEATURE_FLAG_CONFIGURATION, FeatureFlagsBootstrapService],
    };
  }
}
