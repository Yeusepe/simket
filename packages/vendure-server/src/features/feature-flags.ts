/**
 * Purpose: OpenFeature-based feature flag system for Simket.
 *
 * Uses the official InMemoryProvider from @openfeature/server-sdk
 * and provides thin convenience helpers for flag evaluation.
 *
 * Governing docs:
 *   - docs/architecture.md
 * External references:
 *   - https://openfeature.dev/docs/reference/concepts/evaluation-api
 *   - https://openfeature.dev/docs/reference/technologies/server/javascript/
 *   - https://openfeature.dev/specification/sections/flag-evaluation
 * Tests:
 *   - packages/vendure-server/src/features/feature-flags.test.ts
 */
import {
  OpenFeature,
  InMemoryProvider,
  type Provider,
  type EvaluationContext,
  type FlagConfiguration,
} from '@openfeature/server-sdk';

// Re-export the SDK's InMemoryProvider and FlagConfiguration for convenience
export { InMemoryProvider };
export type { FlagConfiguration };

// ── Initialization ────────────────────────────────────────────────────────────

/**
 * Initialize the OpenFeature SDK with a provider.
 * Falls back to an in-memory provider with empty config for local dev.
 *
 * Docs: https://openfeature.dev/docs/reference/technologies/server/javascript/#setting-a-provider
 */
export async function initFeatureFlags(
  provider?: Provider,
): Promise<void> {
  const resolvedProvider = provider ?? new InMemoryProvider({});
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
