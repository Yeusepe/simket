/**
 * Purpose: OpenFeature-based feature flag system for Simket.
 *
 * Uses the official InMemoryProvider from @openfeature/server-sdk.
 * The former @openfeature/in-memory-provider companion package has been removed,
 * so the server SDK's built-in provider is the authoritative implementation,
 * while this module adds thin convenience helpers for flag evaluation.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://openfeature.dev/docs/reference/concepts/evaluation-api
 *   - https://openfeature.dev/docs/reference/sdks/server/javascript/
 *   - https://openfeature.dev/specification/sections/flag-evaluation
 *   - https://github.com/open-feature/js-sdk-contrib/blob/main/libs/providers/in-memory/README.md
 * Tests:
 *   - packages/vendure-server/src/features/feature-flags.test.ts
 */
import {
  OpenFeature,
  InMemoryProvider,
  type Provider,
  type EvaluationContext,
} from '@openfeature/server-sdk';

// Re-export the SDK's InMemoryProvider for convenience
export { InMemoryProvider };

/**
 * FlagConfiguration mirrors the SDK's internal type (not exported by the SDK).
 * Derived from ConstructorParameters<typeof InMemoryProvider> for correctness.
 *
 * Each flag has:
 *   - variants: Record<string, T> — the possible values keyed by variant name
 *   - defaultVariant: string — which variant key to use by default
 *   - disabled: boolean — whether the flag is disabled
 *   - contextEvaluator?: (ctx) => string — optional function returning variant key for context
 */
export type FlagConfiguration = NonNullable<ConstructorParameters<typeof InMemoryProvider>[0]>;

export const DEFAULT_FLAG_CONFIGURATION: FlagConfiguration = {
  'recommendation-boost': {
    variants: { on: true, off: false },
    defaultVariant: 'off',
    disabled: false,
  },
  'new-checkout-flow': {
    variants: { on: true, off: false },
    defaultVariant: 'off',
    disabled: false,
  },
  'max-bundle-size': {
    variants: { default: 10 },
    defaultVariant: 'default',
    disabled: false,
  },
};

export function createDefaultFeatureFlagProvider(
  flagConfiguration: FlagConfiguration = DEFAULT_FLAG_CONFIGURATION,
): InMemoryProvider {
  return new InMemoryProvider(flagConfiguration);
}

// ── Initialization ────────────────────────────────────────────────────────────

/**
 * Initialize the OpenFeature SDK with a provider.
 * Falls back to an in-memory provider with empty config for local dev.
 *
 * Docs: https://openfeature.dev/docs/reference/sdks/server/javascript/#providers
 */
export async function initFeatureFlags(
  provider?: Provider,
): Promise<void> {
  const resolvedProvider = provider ?? createDefaultFeatureFlagProvider();
  await OpenFeature.setProviderAndWait(resolvedProvider);
}

// ── Flag evaluation helpers ───────────────────────────────────────────────────

/**
 * Evaluate a feature flag and return its value.
 *
 * Determines the correct evaluation method based on the type of `defaultValue`.
 *
 * Docs: https://openfeature.dev/docs/reference/concepts/evaluation-api
 */
export async function getFlag<T extends boolean | string | number>(
  key: string,
  defaultValue: T,
  context?: EvaluationContext,
): Promise<T> {
  const client = OpenFeature.getClient();

  if (typeof defaultValue === 'boolean') {
    return (await client.getBooleanValue(
      key,
      defaultValue,
      context,
    )) as T;
  }

  if (typeof defaultValue === 'string') {
    return (await client.getStringValue(
      key,
      defaultValue,
      context,
    )) as T;
  }

  if (typeof defaultValue === 'number') {
    return (await client.getNumberValue(
      key,
      defaultValue,
      context,
    )) as T;
  }

  return defaultValue;
}

/**
 * Convenience: check if a boolean feature flag is enabled.
 *
 * Returns `false` for unknown flags.
 */
export async function isEnabled(
  key: string,
  context?: EvaluationContext,
): Promise<boolean> {
  return getFlag(key, false, context);
}
