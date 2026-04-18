import { describe, it, expect } from 'vitest';
import type { RuntimeVendureConfig } from '@vendure/core';
import { catalogConfiguration, MIN_TAKE_RATE, MAX_TAKE_RATE, validateTakeRate } from './catalog.plugin.js';

/**
 * Helper: build a minimal config, run catalogConfiguration, return Product custom fields.
 */
function applyPluginConfig(existingProductFields: unknown[] = []) {
  const baseConfig = {
    customFields: {
      Product: existingProductFields,
    },
  } as RuntimeVendureConfig;

  const result = catalogConfiguration(baseConfig);
  return (result.customFields?.Product ?? []) as Array<{
    name: string;
    type: string;
    nullable?: boolean;
    defaultValue?: unknown;
    public?: boolean;
    min?: number;
    max?: number;
    validate?: (value: unknown) => string | undefined;
    [k: string]: unknown;
  }>;
}

describe('CatalogPlugin', () => {
  describe('constants', () => {
    it('exports MIN_TAKE_RATE as 5', () => {
      expect(MIN_TAKE_RATE).toBe(5);
    });

    it('exports MAX_TAKE_RATE as 100', () => {
      expect(MAX_TAKE_RATE).toBe(100);
    });
  });

  describe('configuration function', () => {
    it('adds 6 custom fields to Product', () => {
      const fields = applyPluginConfig();
      expect(fields.length).toBe(6);
    });

    it('preserves existing custom fields on Product', () => {
      const existing = [{ name: 'existingField', type: 'string' }];
      const fields = applyPluginConfig(existing);
      expect(fields.length).toBe(7);
      expect(fields[0].name).toBe('existingField');
    });
  });

  describe('tiptapDescription field', () => {
    it('is a text field for JSONB storage', () => {
      const field = applyPluginConfig().find((f) => f.name === 'tiptapDescription');
      expect(field).toBeDefined();
      expect(field!.type).toBe('text');
      expect(field!.nullable).toBe(true);
      expect(field!.public).toBe(true);
    });
  });

  describe('termsOfService field', () => {
    it('is a text field for JSONB storage', () => {
      const field = applyPluginConfig().find((f) => f.name === 'termsOfService');
      expect(field).toBeDefined();
      expect(field!.type).toBe('text');
      expect(field!.nullable).toBe(true);
      expect(field!.public).toBe(true);
    });
  });

  describe('heroAssetId field', () => {
    it('is a string field for CDNgine asset reference', () => {
      const field = applyPluginConfig().find((f) => f.name === 'heroAssetId');
      expect(field).toBeDefined();
      expect(field!.type).toBe('string');
      expect(field!.nullable).toBe(true);
      expect(field!.public).toBe(true);
    });
  });

  describe('heroTransparentAssetId field', () => {
    it('is a string field', () => {
      const field = applyPluginConfig().find(
        (f) => f.name === 'heroTransparentAssetId',
      );
      expect(field).toBeDefined();
      expect(field!.type).toBe('string');
      expect(field!.nullable).toBe(true);
    });
  });

  describe('heroBackgroundAssetId field', () => {
    it('is a string field', () => {
      const field = applyPluginConfig().find(
        (f) => f.name === 'heroBackgroundAssetId',
      );
      expect(field).toBeDefined();
      expect(field!.type).toBe('string');
      expect(field!.nullable).toBe(true);
    });
  });

  describe('platformTakeRate field', () => {
    it('is an int field with default MIN_TAKE_RATE', () => {
      const field = applyPluginConfig().find((f) => f.name === 'platformTakeRate');
      expect(field).toBeDefined();
      expect(field!.type).toBe('int');
      expect(field!.nullable).toBe(false);
      expect(field!.defaultValue).toBe(MIN_TAKE_RATE);
      expect(field!.public).toBe(true);
    });

    it('has min/max constraints', () => {
      const field = applyPluginConfig().find((f) => f.name === 'platformTakeRate')!;
      expect(field.min).toBe(MIN_TAKE_RATE);
      expect(field.max).toBe(MAX_TAKE_RATE);
    });

    it('validates: rejects values below minimum', () => {
      const field = applyPluginConfig().find((f) => f.name === 'platformTakeRate')!;
      const result = field.validate!(4);
      expect(result).toContain('at least');
    });

    it('validates: rejects values above maximum', () => {
      const field = applyPluginConfig().find((f) => f.name === 'platformTakeRate')!;
      const result = field.validate!(101);
      expect(result).toContain('at most');
    });

    it('validates: accepts valid values', () => {
      const field = applyPluginConfig().find((f) => f.name === 'platformTakeRate')!;
      expect(field.validate!(5)).toBeUndefined();
      expect(field.validate!(50)).toBeUndefined();
      expect(field.validate!(100)).toBeUndefined();
    });

    it('validates: rejects non-numeric values', () => {
      const field = applyPluginConfig().find((f) => f.name === 'platformTakeRate')!;
      expect(field.validate!('not a number' as unknown as number)).toContain(
        'finite number',
      );
      expect(field.validate!(NaN)).toContain('finite number');
      expect(field.validate!(Infinity)).toContain('finite number');
    });
  });

  describe('validateTakeRate (exported)', () => {
    it('returns undefined for valid values', () => {
      expect(validateTakeRate(5)).toBeUndefined();
      expect(validateTakeRate(50)).toBeUndefined();
      expect(validateTakeRate(100)).toBeUndefined();
    });

    it('rejects below minimum', () => {
      expect(validateTakeRate(4)).toContain('at least');
      expect(validateTakeRate(0)).toContain('at least');
      expect(validateTakeRate(-1)).toContain('at least');
    });

    it('rejects above maximum', () => {
      expect(validateTakeRate(101)).toContain('at most');
    });

    it('rejects non-finite numbers', () => {
      expect(validateTakeRate(NaN)).toContain('finite number');
      expect(validateTakeRate(Infinity)).toContain('finite number');
      expect(validateTakeRate('str' as unknown as number)).toContain('finite number');
    });
  });

  describe('field naming conventions', () => {
    it('all field names are camelCase (no spaces or special chars)', () => {
      const fields = applyPluginConfig();
      for (const field of fields) {
        expect(field.name).toMatch(/^[a-z][a-zA-Z0-9]*$/);
      }
    });
  });
});
