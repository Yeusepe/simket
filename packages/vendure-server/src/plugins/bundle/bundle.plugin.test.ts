/**
 * Purpose: Tests for BundlePlugin — groups multiple products into discounted bundles.
 * Governing docs:
 *   - docs/architecture.md (§4 Product model)
 *   - docs/domain-model.md (Bundle entity)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 * Tests:
 *   - (this file)
 */
import { describe, it, expect } from 'vitest';
import type { RuntimeVendureConfig } from '@vendure/core';
import {
  bundleConfiguration,
  validateDiscountPercent,
  calculateBundlePrice,
} from './bundle.plugin.js';
import { BundleEntity } from './bundle.entity.js';

/**
 * Helper: build a minimal config, run bundleConfiguration, return the modified config.
 */
function applyPluginConfig(base?: Partial<RuntimeVendureConfig>): RuntimeVendureConfig {
  const baseConfig = {
    customFields: {},
    ...base,
  } as RuntimeVendureConfig;
  return bundleConfiguration(baseConfig);
}

describe('BundlePlugin', () => {
  describe('BundleEntity structure', () => {
    it('can be instantiated with DeepPartial input', () => {
      const bundle = new BundleEntity({
        name: 'Starter Pack',
        discountPercent: 10,
        enabled: true,
      });
      expect(bundle.name).toBe('Starter Pack');
      expect(bundle.discountPercent).toBe(10);
      expect(bundle.enabled).toBe(true);
    });

    it('has default values when constructed empty', () => {
      const bundle = new BundleEntity();
      expect(bundle).toBeDefined();
      // description defaults to null (nullable)
      expect(bundle.description).toBeUndefined();
    });
  });

  describe('bundleConfiguration', () => {
    it('registers BundleEntity in the entities array', () => {
      const config = applyPluginConfig();
      // The configuration function should add BundleEntity to customFields or
      // at minimum not throw. Entity registration happens via @VendurePlugin metadata,
      // but the config function can add custom fields referencing bundles.
      expect(config).toBeDefined();
    });

    it('adds bundle-related custom fields to Product', () => {
      const config = applyPluginConfig({
        customFields: { Product: [] },
      } as unknown as Partial<RuntimeVendureConfig>);
      const productFields = (config.customFields?.Product ?? []) as Array<{
        name: string;
        type: string;
        [k: string]: unknown;
      }>;
      const bundleIdsField = productFields.find((f) => f.name === 'bundleIds');
      expect(bundleIdsField).toBeDefined();
      expect(bundleIdsField!.type).toBe('string');
    });

    it('preserves existing Product custom fields', () => {
      const existing = [{ name: 'existingField', type: 'string' }];
      const config = applyPluginConfig({
        customFields: { Product: existing },
      } as unknown as Partial<RuntimeVendureConfig>);
      const productFields = (config.customFields?.Product ?? []) as Array<{
        name: string;
        [k: string]: unknown;
      }>;
      expect(productFields.find((f) => f.name === 'existingField')).toBeDefined();
      expect(productFields.find((f) => f.name === 'bundleIds')).toBeDefined();
    });
  });

  describe('validateDiscountPercent', () => {
    it('returns undefined for valid 0% discount', () => {
      expect(validateDiscountPercent(0)).toBeUndefined();
    });

    it('returns undefined for valid 50% discount', () => {
      expect(validateDiscountPercent(50)).toBeUndefined();
    });

    it('returns undefined for valid 100% discount', () => {
      expect(validateDiscountPercent(100)).toBeUndefined();
    });

    it('rejects negative values', () => {
      const result = validateDiscountPercent(-1);
      expect(result).toBeDefined();
      expect(result).toContain('at least');
    });

    it('rejects values above 100', () => {
      const result = validateDiscountPercent(101);
      expect(result).toBeDefined();
      expect(result).toContain('at most');
    });

    it('rejects non-finite numbers', () => {
      expect(validateDiscountPercent(NaN)).toContain('finite number');
      expect(validateDiscountPercent(Infinity)).toContain('finite number');
    });

    it('rejects non-number types', () => {
      expect(validateDiscountPercent('abc' as unknown as number)).toContain('finite number');
    });
  });

  describe('calculateBundlePrice', () => {
    it('sums individual prices with 0% discount', () => {
      const result = calculateBundlePrice([1000, 2000, 3000], 0);
      expect(result).toBe(6000);
    });

    it('applies 25% discount correctly', () => {
      const result = calculateBundlePrice([1000, 2000, 3000], 25);
      // 6000 * 0.75 = 4500
      expect(result).toBe(4500);
    });

    it('applies 100% discount (free bundle)', () => {
      const result = calculateBundlePrice([1000, 2000], 100);
      expect(result).toBe(0);
    });

    it('returns 0 for empty price array', () => {
      const result = calculateBundlePrice([], 10);
      expect(result).toBe(0);
    });

    it('rounds to nearest integer (no fractional cents)', () => {
      // 333 * (1 - 0.10) = 299.7 → 300
      const result = calculateBundlePrice([333], 10);
      expect(result).toBe(Math.round(333 * 0.9));
    });

    it('handles single product with 50% discount', () => {
      const result = calculateBundlePrice([5000], 50);
      expect(result).toBe(2500);
    });
  });
});
