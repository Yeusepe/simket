/**
 * Purpose: Tests for PlatformFeeService — fee calculation and recommendation boost.
 *
 * Governing docs:
 *   - docs/architecture.md §7.2 (Hyperswitch fee model)
 *   - docs/service-architecture.md §1.13 (Payment API contract)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/custom-fields/
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePlatformFee,
  calculateCreatorRevenue,
  getRecommendationBoost,
  MIN_TAKE_RATE,
  MAX_TAKE_RATE,
  MIN_PRICE_CENTS,
  validateFeeConfiguration,
} from './platform-fee.service.js';

describe('PlatformFeeService', () => {
  describe('calculatePlatformFee', () => {
    it('calculates 5% fee on a $10 product', () => {
      const fee = calculatePlatformFee(1000, 5);
      expect(fee).toBe(50);
    });

    it('calculates 10% fee on a $20 product', () => {
      const fee = calculatePlatformFee(2000, 10);
      expect(fee).toBe(200);
    });

    it('calculates 15% fee on a $100 product', () => {
      const fee = calculatePlatformFee(10000, 15);
      expect(fee).toBe(1500);
    });

    it('rounds up fractional cents (ceiling)', () => {
      // 5% of $1.01 = 5.05 cents → 6 cents (ceil)
      const fee = calculatePlatformFee(101, 5);
      expect(fee).toBe(6);
    });

    it('handles 100% take rate', () => {
      const fee = calculatePlatformFee(1000, 100);
      expect(fee).toBe(1000);
    });

    it('throws on take rate below minimum', () => {
      expect(() => calculatePlatformFee(1000, 4)).toThrow(
        `Take rate must be between ${MIN_TAKE_RATE}% and ${MAX_TAKE_RATE}%`,
      );
    });

    it('throws on take rate above maximum', () => {
      expect(() => calculatePlatformFee(1000, 101)).toThrow(
        `Take rate must be between ${MIN_TAKE_RATE}% and ${MAX_TAKE_RATE}%`,
      );
    });

    it('throws on zero price', () => {
      expect(() => calculatePlatformFee(0, 5)).toThrow(
        'Price must be a positive integer (cents)',
      );
    });

    it('throws on negative price', () => {
      expect(() => calculatePlatformFee(-100, 5)).toThrow(
        'Price must be a positive integer (cents)',
      );
    });
  });

  describe('calculateCreatorRevenue', () => {
    it('returns price minus fee for 5% on $10', () => {
      const revenue = calculateCreatorRevenue(1000, 5);
      expect(revenue).toBe(950);
    });

    it('returns price minus fee for 10% on $20', () => {
      const revenue = calculateCreatorRevenue(2000, 10);
      expect(revenue).toBe(1800);
    });

    it('returns 0 at 100% take rate', () => {
      const revenue = calculateCreatorRevenue(1000, 100);
      expect(revenue).toBe(0);
    });

    it('fee + revenue always equals price', () => {
      for (const price of [99, 100, 101, 999, 1000, 5555, 10000]) {
        for (const rate of [5, 7, 10, 15, 25, 50, 100]) {
          const fee = calculatePlatformFee(price, rate);
          const revenue = calculateCreatorRevenue(price, rate);
          expect(fee + revenue).toBe(price);
        }
      }
    });
  });

  describe('getRecommendationBoost', () => {
    it('returns 1.0 at minimum take rate (5%)', () => {
      expect(getRecommendationBoost(5)).toBe(1.0);
    });

    it('returns 1.5 at 10%', () => {
      expect(getRecommendationBoost(10)).toBe(1.5);
    });

    it('returns 2.0 at 15%', () => {
      expect(getRecommendationBoost(15)).toBe(2.0);
    });

    it('returns 10.5 at 100%', () => {
      expect(getRecommendationBoost(100)).toBe(10.5);
    });

    it('never returns below 1.0', () => {
      // Even if somehow called with min rate, it's 1.0
      expect(getRecommendationBoost(MIN_TAKE_RATE)).toBeGreaterThanOrEqual(1.0);
    });

    it('throws on rate below minimum', () => {
      expect(() => getRecommendationBoost(4)).toThrow();
    });
  });

  describe('validateFeeConfiguration', () => {
    it('accepts valid configuration', () => {
      const result = validateFeeConfiguration({ takeRate: 10, priceCents: 500 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects take rate below minimum', () => {
      const result = validateFeeConfiguration({ takeRate: 3, priceCents: 500 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Take rate must be at least ${MIN_TAKE_RATE}%`,
      );
    });

    it('rejects take rate above maximum', () => {
      const result = validateFeeConfiguration({ takeRate: 101, priceCents: 500 });
      expect(result.valid).toBe(false);
    });

    it('rejects price below minimum', () => {
      const result = validateFeeConfiguration({ takeRate: 5, priceCents: 10 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Price must be at least ${MIN_PRICE_CENTS} cents ($${(MIN_PRICE_CENTS / 100).toFixed(2)})`,
      );
    });

    it('accepts free products (price 0)', () => {
      const result = validateFeeConfiguration({ takeRate: 5, priceCents: 0 });
      expect(result.valid).toBe(true);
    });

    it('rejects non-integer take rate', () => {
      const result = validateFeeConfiguration({ takeRate: 5.5, priceCents: 500 });
      expect(result.valid).toBe(false);
    });

    it('rejects NaN take rate', () => {
      const result = validateFeeConfiguration({ takeRate: NaN, priceCents: 500 });
      expect(result.valid).toBe(false);
    });
  });
});
