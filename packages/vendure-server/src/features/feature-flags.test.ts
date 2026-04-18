/**
 * Tests: Feature flags module using OpenFeature SDK.
 *
 * Governing docs:
 *   - docs/architecture.md
 * External references:
 *   - https://openfeature.dev/docs/reference/concepts/evaluation-api
 *   - https://openfeature.dev/docs/reference/technologies/server/javascript/
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenFeature } from '@openfeature/server-sdk';
import { initFeatureFlags, getFlag, isEnabled, InMemoryProvider } from './feature-flags.js';
import type { FlagConfiguration } from './feature-flags.js';

describe('InMemoryProvider', () => {
  it('should implement the Provider interface with metadata', () => {
    const provider = new InMemoryProvider({});
    expect(provider.metadata.name).toBe('simket-in-memory');
  });

  it('should resolve boolean flags', async () => {
    const flags: FlagConfiguration = {
      'dark-mode': {
        defaultValue: false,
        variants: { on: true, off: false },
      },
    };
    const provider = new InMemoryProvider(flags);
    const result = await provider.resolveBooleanEvaluation('dark-mode', false);
    expect(result.value).toBe(false);
  });

  it('should resolve string flags', async () => {
    const flags: FlagConfiguration = {
      'checkout-version': {
        defaultValue: 'v1',
        variants: { v1: 'v1', v2: 'v2' },
      },
    };
    const provider = new InMemoryProvider(flags);
    const result = await provider.resolveStringEvaluation('checkout-version', 'v1');
    expect(result.value).toBe('v1');
  });

  it('should resolve number flags', async () => {
    const flags: FlagConfiguration = {
      'max-cart-items': {
        defaultValue: 50,
        variants: { low: 10, high: 50 },
      },
    };
    const provider = new InMemoryProvider(flags);
    const result = await provider.resolveNumberEvaluation('max-cart-items', 50);
    expect(result.value).toBe(50);
  });

  it('should return default value when flag is not found', async () => {
    const provider = new InMemoryProvider({});
    const result = await provider.resolveBooleanEvaluation('nonexistent-flag', true);
    expect(result.value).toBe(true);
    expect(result.reason).toBe('DEFAULT');
  });

  it('should apply targeting rules when context matches', async () => {
    const flags: FlagConfiguration = {
      'beta-feature': {
        defaultValue: false,
        variants: { on: true, off: false },
        rules: [
          {
            contextKey: 'userTier',
            contextValue: 'premium',
            variant: 'on',
          },
        ],
      },
    };
    const provider = new InMemoryProvider(flags);
    const result = await provider.resolveBooleanEvaluation('beta-feature', false, {
      userTier: 'premium',
    });
    expect(result.value).toBe(true);
    expect(result.reason).toBe('TARGETING_MATCH');
  });

  it('should return default when context does not match rules', async () => {
    const flags: FlagConfiguration = {
      'beta-feature': {
        defaultValue: false,
        variants: { on: true, off: false },
        rules: [
          {
            contextKey: 'userTier',
            contextValue: 'premium',
            variant: 'on',
          },
        ],
      },
    };
    const provider = new InMemoryProvider(flags);
    const result = await provider.resolveBooleanEvaluation('beta-feature', false, {
      userTier: 'free',
    });
    expect(result.value).toBe(false);
    expect(result.reason).toBe('DEFAULT');
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
        defaultValue: true,
        variants: { on: true, off: false },
      },
    });
    await initFeatureFlags(customProvider);
    const client = OpenFeature.getClient();
    expect(client).toBeDefined();
  });
});

describe('getFlag', () => {
  beforeEach(async () => {
    const provider = new InMemoryProvider({
      'dark-mode': {
        defaultValue: true,
        variants: { on: true, off: false },
      },
      'checkout-version': {
        defaultValue: 'v1',
        variants: { v1: 'v1', v2: 'v2' },
        rules: [
          {
            contextKey: 'region',
            contextValue: 'eu',
            variant: 'v2',
          },
        ],
      },
      'max-retries': {
        defaultValue: 3,
        variants: { low: 1, high: 5 },
      },
    });
    await initFeatureFlags(provider);
  });

  afterEach(async () => {
    await OpenFeature.close();
  });

  it('should return boolean flag value', async () => {
    const value = await getFlag('dark-mode', false);
    expect(value).toBe(true);
  });

  it('should return string flag value', async () => {
    const value = await getFlag('checkout-version', 'v0');
    expect(value).toBe('v1');
  });

  it('should return string flag with context targeting', async () => {
    const value = await getFlag('checkout-version', 'v0', { region: 'eu' });
    expect(value).toBe('v2');
  });

  it('should return number flag value', async () => {
    const value = await getFlag('max-retries', 0);
    expect(value).toBe(3);
  });

  it('should return default value for unknown flag', async () => {
    const value = await getFlag('unknown', 42);
    expect(value).toBe(42);
  });
});

describe('isEnabled', () => {
  beforeEach(async () => {
    const provider = new InMemoryProvider({
      'new-checkout': {
        defaultValue: true,
        variants: { on: true, off: false },
      },
      'disabled-feature': {
        defaultValue: false,
        variants: { on: true, off: false },
      },
    });
    await initFeatureFlags(provider);
  });

  afterEach(async () => {
    await OpenFeature.close();
  });

  it('should return true for enabled flag', async () => {
    const result = await isEnabled('new-checkout');
    expect(result).toBe(true);
  });

  it('should return false for disabled flag', async () => {
    const result = await isEnabled('disabled-feature');
    expect(result).toBe(false);
  });

  it('should return false for unknown flag', async () => {
    const result = await isEnabled('nonexistent');
    expect(result).toBe(false);
  });
});
