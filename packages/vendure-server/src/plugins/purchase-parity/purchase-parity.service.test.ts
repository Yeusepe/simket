/**
 * Purpose: Tests for PurchaseParityService — regional discount resolution and validation.
 *
 * Governing docs:
 *   - docs/architecture.md §7.2 (Hyperswitch fee model — regional pricing)
 *   - docs/domain-model.md §4.1 (Product pricing)
 * External references:
 *   - ISO 3166-1 alpha-2 country codes
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import { resolveRegion, isRegionGroup, COUNTRY_TO_REGION } from './regions.js';
import {
  resolveRegionalDiscount,
  applyRegionalDiscount,
  validateRegionalPricing,
  MAX_DISCOUNT_PERCENT,
} from './purchase-parity.service.js';
import type { RegionalPricingRule } from './purchase-parity.service.js';

describe('regions', () => {
  describe('resolveRegion', () => {
    it('resolves BR to LATAM', () => {
      expect(resolveRegion('BR')).toBe('LATAM');
    });

    it('resolves VN to SEA', () => {
      expect(resolveRegion('VN')).toBe('SEA');
    });

    it('resolves NG to AFRICA', () => {
      expect(resolveRegion('NG')).toBe('AFRICA');
    });

    it('resolves PL to EASTERN_EUROPE', () => {
      expect(resolveRegion('PL')).toBe('EASTERN_EUROPE');
    });

    it('resolves IN to SOUTH_ASIA', () => {
      expect(resolveRegion('IN')).toBe('SOUTH_ASIA');
    });

    it('resolves SA to MIDDLE_EAST', () => {
      expect(resolveRegion('SA')).toBe('MIDDLE_EAST');
    });

    it('resolves RU to CIS', () => {
      expect(resolveRegion('RU')).toBe('CIS');
    });

    it('returns undefined for US (not in any region group)', () => {
      expect(resolveRegion('US')).toBeUndefined();
    });

    it('is case-insensitive', () => {
      expect(resolveRegion('br')).toBe('LATAM');
    });
  });

  describe('isRegionGroup', () => {
    it('returns true for valid region groups', () => {
      expect(isRegionGroup('LATAM')).toBe(true);
      expect(isRegionGroup('SEA')).toBe(true);
    });

    it('returns false for country codes', () => {
      expect(isRegionGroup('BR')).toBe(false);
    });

    it('returns false for random strings', () => {
      expect(isRegionGroup('NARNIA')).toBe(false);
    });
  });
});

describe('PurchaseParityService', () => {
  const rules: RegionalPricingRule[] = [
    { region: 'LATAM', discountPercent: 40 },
    { region: 'AFRICA', discountPercent: 60 },
    { region: 'SEA', discountPercent: 30 },
    { region: 'BR', discountPercent: 50 }, // Country-specific override for Brazil
  ];

  describe('resolveRegionalDiscount', () => {
    it('returns country-specific discount when it exists (BR = 50%)', () => {
      const discount = resolveRegionalDiscount(rules, 'BR');
      expect(discount).toBe(50);
    });

    it('falls back to region group discount (AR = LATAM = 40%)', () => {
      const discount = resolveRegionalDiscount(rules, 'AR');
      expect(discount).toBe(40);
    });

    it('returns 0 for countries with no rule (US)', () => {
      const discount = resolveRegionalDiscount(rules, 'US');
      expect(discount).toBe(0);
    });

    it('returns 0 for empty rules', () => {
      const discount = resolveRegionalDiscount([], 'BR');
      expect(discount).toBe(0);
    });

    it('is case-insensitive for country codes', () => {
      const discount = resolveRegionalDiscount(rules, 'br');
      expect(discount).toBe(50);
    });
  });

  describe('applyRegionalDiscount', () => {
    it('applies 40% discount to $10 product', () => {
      const result = applyRegionalDiscount(1000, 40);
      expect(result).toBe(600);
    });

    it('applies 50% discount to $20 product', () => {
      const result = applyRegionalDiscount(2000, 50);
      expect(result).toBe(1000);
    });

    it('applies 0% discount (no change)', () => {
      const result = applyRegionalDiscount(1000, 0);
      expect(result).toBe(1000);
    });

    it('rounds down (floor) to favor buyer', () => {
      // 40% off $1.01 = 60.6 cents → 60 cents
      const result = applyRegionalDiscount(101, 40);
      expect(result).toBe(60);
    });

    it('never goes below 0', () => {
      const result = applyRegionalDiscount(100, 100);
      expect(result).toBe(0);
    });
  });

  describe('validateRegionalPricing', () => {
    it('accepts valid configuration', () => {
      const result = validateRegionalPricing({
        region: 'LATAM',
        discountPercent: 40,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts country code as region', () => {
      const result = validateRegionalPricing({
        region: 'BR',
        discountPercent: 50,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects empty region', () => {
      const result = validateRegionalPricing({
        region: '',
        discountPercent: 40,
      });
      expect(result.valid).toBe(false);
    });

    it('rejects discount below 0', () => {
      const result = validateRegionalPricing({
        region: 'LATAM',
        discountPercent: -1,
      });
      expect(result.valid).toBe(false);
    });

    it('rejects discount above max', () => {
      const result = validateRegionalPricing({
        region: 'LATAM',
        discountPercent: MAX_DISCOUNT_PERCENT + 1,
      });
      expect(result.valid).toBe(false);
    });

    it('rejects non-integer discount', () => {
      const result = validateRegionalPricing({
        region: 'LATAM',
        discountPercent: 40.5,
      });
      expect(result.valid).toBe(false);
    });

    it('rejects NaN discount', () => {
      const result = validateRegionalPricing({
        region: 'LATAM',
        discountPercent: NaN,
      });
      expect(result.valid).toBe(false);
    });
  });
});
