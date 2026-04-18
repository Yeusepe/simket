/**
 * Purpose: Tests for ProductMetadataPlugin — metadata custom fields for product pages.
 *
 * Validates: try-avatar URL validation, compatibility flags parsing,
 * avatar ranking clamping, and the plugin configuration function.
 *
 * Governing docs:
 *   - docs/architecture.md §4.1 (Product entity)
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/custom-fields/
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  validateTryAvatarUrl,
  parseCompatibilityFlags,
  validateCompatibilityFlags,
  clampAvatarRanking,
  KNOWN_COMPATIBILITY_FLAGS,
} from './product-metadata.service.js';
import { productMetadataConfiguration } from './product-metadata.plugin.js';
import type { RuntimeVendureConfig } from '@vendure/core';

describe('ProductMetadataService', () => {
  describe('validateTryAvatarUrl', () => {
    it('accepts valid HTTPS URL', () => {
      expect(validateTryAvatarUrl('https://example.com/try')).toBeUndefined();
    });

    it('accepts valid HTTP URL', () => {
      expect(validateTryAvatarUrl('http://example.com/try')).toBeUndefined();
    });

    it('accepts empty string (optional field)', () => {
      expect(validateTryAvatarUrl('')).toBeUndefined();
    });

    it('accepts null/undefined (optional field)', () => {
      expect(validateTryAvatarUrl(null as unknown as string)).toBeUndefined();
      expect(validateTryAvatarUrl(undefined as unknown as string)).toBeUndefined();
    });

    it('rejects non-http(s) URLs', () => {
      expect(validateTryAvatarUrl('ftp://example.com')).toBeDefined();
    });

    it('rejects javascript: protocol', () => {
      expect(validateTryAvatarUrl('javascript:alert(1)')).toBeDefined();
    });

    it('rejects malformed URLs', () => {
      expect(validateTryAvatarUrl('not-a-url')).toBeDefined();
    });
  });

  describe('parseCompatibilityFlags', () => {
    it('parses comma-separated flags', () => {
      expect(parseCompatibilityFlags('vrcfury,poiyomi,lilToon')).toEqual([
        'vrcfury',
        'poiyomi',
        'lilToon',
      ]);
    });

    it('trims whitespace around flags', () => {
      expect(parseCompatibilityFlags(' vrcfury , poiyomi ')).toEqual([
        'vrcfury',
        'poiyomi',
      ]);
    });

    it('filters empty strings', () => {
      expect(parseCompatibilityFlags('vrcfury,,poiyomi,')).toEqual([
        'vrcfury',
        'poiyomi',
      ]);
    });

    it('returns empty array for null/empty input', () => {
      expect(parseCompatibilityFlags('')).toEqual([]);
      expect(parseCompatibilityFlags(null as unknown as string)).toEqual([]);
    });
  });

  describe('validateCompatibilityFlags', () => {
    it('returns no errors for known flags', () => {
      const result = validateCompatibilityFlags(['vrcfury', 'poiyomi']);
      expect(result.valid).toBe(true);
      expect(result.unknownFlags).toHaveLength(0);
    });

    it('identifies unknown flags as warnings (not errors)', () => {
      const result = validateCompatibilityFlags(['vrcfury', 'unknownTool']);
      expect(result.valid).toBe(true); // unknown flags are warnings, not errors
      expect(result.unknownFlags).toContain('unknownTool');
    });

    it('returns empty warnings for empty flags', () => {
      const result = validateCompatibilityFlags([]);
      expect(result.valid).toBe(true);
      expect(result.unknownFlags).toHaveLength(0);
    });
  });

  describe('clampAvatarRanking', () => {
    it('returns value within range', () => {
      expect(clampAvatarRanking(3)).toBe(3);
    });

    it('clamps to minimum (0)', () => {
      expect(clampAvatarRanking(-1)).toBe(0);
    });

    it('clamps to maximum (5)', () => {
      expect(clampAvatarRanking(6)).toBe(5);
    });

    it('rounds to nearest integer', () => {
      expect(clampAvatarRanking(3.7)).toBe(4);
    });

    it('returns 0 for NaN', () => {
      expect(clampAvatarRanking(NaN)).toBe(0);
    });
  });

  describe('KNOWN_COMPATIBILITY_FLAGS', () => {
    it('includes common VR avatar tools', () => {
      expect(KNOWN_COMPATIBILITY_FLAGS).toContain('vrcfury');
      expect(KNOWN_COMPATIBILITY_FLAGS).toContain('poiyomi');
      expect(KNOWN_COMPATIBILITY_FLAGS).toContain('lilToon');
    });

    it('includes platform entries', () => {
      expect(KNOWN_COMPATIBILITY_FLAGS).toContain('unity');
      expect(KNOWN_COMPATIBILITY_FLAGS).toContain('unreal');
      expect(KNOWN_COMPATIBILITY_FLAGS).toContain('godot');
    });
  });

  describe('productMetadataConfiguration', () => {
    it('adds metadata custom fields to Product', () => {
      const config = productMetadataConfiguration({
        customFields: {},
      } as unknown as RuntimeVendureConfig);

      const productFields = config.customFields?.Product;
      expect(productFields).toBeDefined();
      expect(Array.isArray(productFields)).toBe(true);

      const names = (productFields as Array<{ name: string }>).map((f) => f.name);
      expect(names).toContain('tryAvatarUrl');
      expect(names).toContain('avatarRanking');
      expect(names).toContain('compatibilityFlags');
      expect(names).toContain('platformSupport');
    });

    it('preserves existing Product custom fields', () => {
      const existing = {
        name: 'existing',
        type: 'string' as const,
      };
      const config = productMetadataConfiguration({
        customFields: { Product: [existing] },
      } as unknown as RuntimeVendureConfig);

      const productFields = config.customFields?.Product;
      const names = (productFields as Array<{ name: string }>).map((f) => f.name);
      expect(names).toContain('existing');
      expect(names).toContain('tryAvatarUrl');
    });
  });
});
