/**
 * Purpose: OpenFeature-based feature flag system for Simket.
 *
 * Provides an in-memory provider for local dev and a facade over
 * the OpenFeature SDK for flag evaluation with context targeting.
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
  type Provider,
  type EvaluationContext,
  type ResolutionDetails,
  type JsonValue,
} from '@openfeature/server-sdk';

// ── Flag configuration types ──────────────────────────────────────────────────

export interface TargetingRule {
  contextKey: string;
  contextValue: string;
  variant: string;
}

export interface FlagDefinition {
  defaultValue: boolean | string | number;
  variants: Record<string, boolean | string | number>;
  rules?: TargetingRule[];
}

export type FlagConfiguration = Record<string, FlagDefinition>;

// ── InMemoryProvider ──────────────────────────────────────────────────────────

/**
 * In-memory OpenFeature provider for local development.
 *
 * Reads flags from a static configuration object. Supports boolean, string,
 * and number flag types with optional context-based targeting rules.
 *
 * Docs: https://openfeature.dev/docs/reference/concepts/provider
 */
export class InMemoryProvider implements Provider {
  readonly metadata = { name: 'simket-in-memory' } as const;
  private readonly flags: FlagConfiguration;

  constructor(flags: FlagConfiguration) {
    this.flags = flags;
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context?: EvaluationContext,
  ): Promise<ResolutionDetails<boolean>> {
    return this.resolve(flagKey, defaultValue, context);
  }

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context?: EvaluationContext,
  ): Promise<ResolutionDetails<string>> {
    return this.resolve(flagKey, defaultValue, context);
  }

  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context?: EvaluationContext,
  ): Promise<ResolutionDetails<number>> {
    return this.resolve(flagKey, defaultValue, context);
  }

  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    _context?: EvaluationContext,
  ): Promise<ResolutionDetails<T>> {
    return { value: defaultValue, reason: 'DEFAULT' };
  }

  private resolve<T extends boolean | string | number>(
    flagKey: string,
    defaultValue: T,
    context?: EvaluationContext,
  ): ResolutionDetails<T> {
    const flag = this.flags[flagKey];
    if (!flag) {
      return { value: defaultValue, reason: 'DEFAULT' };
    }

    // Evaluate targeting rules if context is provided
    if (flag.rules && context) {
      for (const rule of flag.rules) {
        const contextVal = context[rule.contextKey];
        if (contextVal !== undefined && String(contextVal) === rule.contextValue) {
          const variant = flag.variants[rule.variant];
          if (variant !== undefined) {
            return {
              value: variant as T,
              variant: rule.variant,
              reason: 'TARGETING_MATCH',
            };
          }
        }
      }
    }

    return {
      value: flag.defaultValue as T,
      reason: 'STATIC',
    };
  }
}

// ── Initialization ────────────────────────────────────────────────────────────

const DEFAULT_FLAGS: FlagConfiguration = {};

/**
 * Initialize the OpenFeature SDK with a provider.
 * Falls back to an in-memory provider with empty config for local dev.
 *
 * Docs: https://openfeature.dev/docs/reference/technologies/server/javascript/#setting-a-provider
 */
export async function initFeatureFlags(
  provider?: Provider,
): Promise<void> {
  const resolvedProvider = provider ?? new InMemoryProvider(DEFAULT_FLAGS);
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
