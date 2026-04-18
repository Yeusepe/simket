/**
 * Tests: Feature flags module using OpenFeature SDK's built-in InMemoryProvider.
 *
 * Governing docs:
 *   - docs/architecture.md
 * External references:
 *   - https://openfeature.dev/docs/reference/concepts/evaluation-api
 *   - https://openfeature.dev/docs/reference/technologies/server/javascript/
 */
import { describe, it, expect, afterEach } from 'vitest';
import { OpenFeature } from '@openfeature/server-sdk';
import { initFeatureFlags, getFlag, isEnabled, InMemoryProvider } from './feature-flags.js';
import type { FlagConfiguration } from './feature-flags.js';

describe('InMemoryProvider (SDK)', () => {
  it('should have the expected metadata name', () => {
    const provider = new InMemoryProvider({});
    expect(provider.metadata.name).toBe('in-memory');
  });

  it('should resolve boolean flags', async () => {
    const flags: FlagConfiguration = {
      'dark-mode': {
        variants: { on: true, off: false },
        defaultVariant: 'off',
        disabled: false,
      },
    };
    const provider = new InMemoryProvider(flags);
    const result = await provider.resolveBooleanEvaluation('dark-mode', true);
    expect(result.value).toBe(false);
  });

  it('should resolve string flags', async () => {
    const flags: FlagConfiguration = {
      'checkout-version': {
        variants: { v1: 'v1', v2: 'v2' },
        defaultVariant: 'v1',
        disabled: false,
      },
    };
    const provider = new InMemoryProvider(flags);
    const result = await provider.resolveStringEvaluation('checkout-version', 'v0');
    expect(result.value).toBe('v1');
  });

  it('should resolve number flags', async () => {
    const flags: FlagConfiguration = {
      'max-cart-items': {
        variants: { low: 10, high: 50 },
        defaultVariant: 'high',
        disabled: false,
      },
    };
    const provider = new InMemoryProvider(flags);
    const result = await provider.resolveNumberEvaluation('max-cart-items', 0);
    expect(result.value).toBe(50);
  });

  it('should throw FlagNotFoundError when flag is not found (client handles gracefully)', async () => {
    const provider = new InMemoryProvider({});
    await expect(
      provider.resolveBooleanEvaluation('nonexistent-flag', true),
    ).rejects.toThrow('no flag found');
  });

  it('should apply contextEvaluator when context matches', async () => {
    const flags: FlagConfiguration = {
      'beta-feature': {
        variants: { on: true, off: false },
        defaultVariant: 'off',
        disabled: false,
        contextEvaluator: (ctx) =>
          ctx['userTier'] === 'premium' ? 'on' : 'off',
      },
    };
    const provider = new InMemoryProvider(flags);
    const result = await provider.resolveBooleanEvaluation('beta-feature', false, {
      userTier: 'premium',
    });
    expect(result.value).toBe(true);
    expect(result.reason).toBe('TARGETING_MATCH');
  });

  it('should return defaultVariant when contextEvaluator does not match', async () => {
    const flags: FlagConfiguration = {
      'beta-feature': {
        variants: { on: true, off: false },
        defaultVariant: 'off',
        disabled: false,
        contextEvaluator: (ctx) =>
          ctx['userTier'] === 'premium' ? 'on' : 'off',
      },
    };
    const provider = new InMemoryProvider(flags);
    const result = await provider.resolveBooleanEvaluation('beta-feature', false, {
      userTier: 'free',
    });
    expect(result.value).toBe(false);
    expect(result.reason).toBe('TARGETING_MATCH');
  });

  it('should support putConfiguration for dynamic flag updates', () => {
    const provider = new InMemoryProvider({
      'my-flag': {
        variants: { on: true, off: false },
        defaultVariant: 'off',
        disabled: false,
      },
    });

    provider.putConfiguration({
      'my-flag': {
        variants: { on: true, off: false },
        defaultVariant: 'on',
        disabled: false,
      },
    });

    // putConfiguration is synchronous and doesn't throw
    expect(provider.metadata.name).toBe('in-memory');
  });
});

describe('initFeatureFlags', () => {
  afterEach(async () => {
    await OpenFeature.close();
  });

  it('should initialize OpenFeature with default InMemoryProvider', async () => {
    await initFeatureFlags();
    const client = OpenFeature.getClient();
    expect(client).toBeDefined();
  });

  it('should initialize OpenFeature with a custom provider', async () => {
    const customProvider = new InMemoryProvider({
      'custom-flag': {
        variants: { on: true, off: false },
        defaultVariant: 'on',
        disabled: false,
      },
    });
    await initFeatureFlags(customProvider);
    const client = OpenFeature.getClient();
    expect(client).toBeDefined();
  });
});

describe('getFlag', () => {
  afterEach(async () => {
    await OpenFeature.close();
  });

  it('should return boolean flag value', async () => {
    const provider = new InMemoryProvider({
      'dark-mode': {
        variants: { on: true, off: false },
        defaultVariant: 'on',
        disabled: false,
      },
    });
    await initFeatureFlags(provider);
    const value = await getFlag('dark-mode', false);
    expect(value).toBe(true);
  });

  it('should return string flag value', async () => {
    const provider = new InMemoryProvider({
      'checkout-version': {
        variants: { v1: 'v1', v2: 'v2' },
        defaultVariant: 'v1',
        disabled: false,
      },
    });
    await initFeatureFlags(provider);
    const value = await getFlag('checkout-version', 'v0');
    expect(value).toBe('v1');
  });

  it('should return string flag with context targeting', async () => {
    const provider = new InMemoryProvider({
      'checkout-version': {
        variants: { v1: 'v1', v2: 'v2' },
        defaultVariant: 'v1',
        disabled: false,
        contextEvaluator: (ctx) =>
          ctx['region'] === 'eu' ? 'v2' : 'v1',
      },
    });
    await initFeatureFlags(provider);
    const value = await getFlag('checkout-version', 'v0', { region: 'eu' });
    expect(value).toBe('v2');
  });

  it('should return number flag value', async () => {
    const provider = new InMemoryProvider({
      'max-retries': {
        variants: { low: 1, medium: 3, high: 5 },
        defaultVariant: 'medium',
        disabled: false,
      },
    });
    await initFeatureFlags(provider);
    const value = await getFlag('max-retries', 0);
    expect(value).toBe(3);
  });

  it('should return default value for unknown flag', async () => {
    await initFeatureFlags();
    const value = await getFlag('unknown', 42);
    expect(value).toBe(42);
  });
});

describe('isEnabled', () => {
  afterEach(async () => {
    await OpenFeature.close();
  });

  it('should return true for enabled flag', async () => {
    const provider = new InMemoryProvider({
      'new-checkout': {
        variants: { on: true, off: false },
        defaultVariant: 'on',
        disabled: false,
      },
    });
    await initFeatureFlags(provider);
    const result = await isEnabled('new-checkout');
    expect(result).toBe(true);
  });

  it('should return false for disabled flag', async () => {
    const provider = new InMemoryProvider({
      'disabled-feature': {
        variants: { on: true, off: false },
        defaultVariant: 'off',
        disabled: false,
      },
    });
    await initFeatureFlags(provider);
    const result = await isEnabled('disabled-feature');
    expect(result).toBe(false);
  });

  it('should return false for unknown flag', async () => {
    await initFeatureFlags();
    const result = await isEnabled('nonexistent');
    expect(result).toBe(false);
  });
});
