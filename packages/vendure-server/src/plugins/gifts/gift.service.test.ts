/**
 * Purpose: Tests for GiftService — gift code generation, validation, claiming, revocation.
 *
 * Governing docs:
 *   - docs/architecture.md §4.3 (Orders and entitlements)
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/custom-fields/
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  generateGiftCode,
  validateGiftCode,
  GiftStatus,
  isGiftClaimable,
  formatGiftCodeForDisplay,
} from './gift.service.js';

describe('GiftService', () => {
  describe('generateGiftCode', () => {
    it('generates a code of expected length (default 16)', () => {
      const code = generateGiftCode();
      // Formatted: XXXX-XXXX-XXXX-XXXX = 19 chars with hyphens, 16 alphanumeric
      const stripped = code.replace(/-/g, '');
      expect(stripped).toHaveLength(16);
    });

    it('generates uppercase alphanumeric only', () => {
      const code = generateGiftCode();
      const stripped = code.replace(/-/g, '');
      expect(stripped).toMatch(/^[A-Z0-9]+$/);
    });

    it('generates unique codes', () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateGiftCode()));
      expect(codes.size).toBe(100);
    });

    it('formats with hyphens in groups of 4', () => {
      const code = generateGiftCode();
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('excludes ambiguous characters (0, O, I, 1, L)', () => {
      // Generate many codes and check none contain ambiguous chars
      for (let i = 0; i < 100; i++) {
        const stripped = generateGiftCode().replace(/-/g, '');
        expect(stripped).not.toMatch(/[0OIL1]/);
      }
    });
  });

  describe('validateGiftCode', () => {
    it('accepts valid formatted code', () => {
      const result = validateGiftCode('ABCD-EFGH-JKMN-PRST');
      expect(result.valid).toBe(true);
    });

    it('accepts valid unformatted code (strips hyphens)', () => {
      const result = validateGiftCode('ABCDEFGHJKMNPRST');
      expect(result.valid).toBe(true);
    });

    it('rejects code that is too short', () => {
      const result = validateGiftCode('ABC');
      expect(result.valid).toBe(false);
    });

    it('rejects code that is too long', () => {
      const result = validateGiftCode('ABCDEFGHJKMNPRSTUVWX');
      expect(result.valid).toBe(false);
    });

    it('rejects empty string', () => {
      const result = validateGiftCode('');
      expect(result.valid).toBe(false);
    });

    it('rejects code with invalid characters', () => {
      const result = validateGiftCode('ABCD-EFGH-!@#$-PRST');
      expect(result.valid).toBe(false);
    });

    it('is case-insensitive', () => {
      const result = validateGiftCode('abcd-efgh-jkmn-prst');
      expect(result.valid).toBe(true);
    });
  });

  describe('isGiftClaimable', () => {
    it('returns true for PURCHASED status', () => {
      expect(isGiftClaimable(GiftStatus.PURCHASED)).toBe(true);
    });

    it('returns false for CLAIMED status', () => {
      expect(isGiftClaimable(GiftStatus.CLAIMED)).toBe(false);
    });

    it('returns false for REVOKED status', () => {
      expect(isGiftClaimable(GiftStatus.REVOKED)).toBe(false);
    });

    it('returns false for EXPIRED status', () => {
      expect(isGiftClaimable(GiftStatus.EXPIRED)).toBe(false);
    });
  });

  describe('formatGiftCodeForDisplay', () => {
    it('formats unformatted code with hyphens', () => {
      expect(formatGiftCodeForDisplay('ABCDEFGHJKMNPRST')).toBe(
        'ABCD-EFGH-JKMN-PRST',
      );
    });

    it('returns already formatted code unchanged', () => {
      expect(formatGiftCodeForDisplay('ABCD-EFGH-JKMN-PRST')).toBe(
        'ABCD-EFGH-JKMN-PRST',
      );
    });

    it('uppercases input', () => {
      expect(formatGiftCodeForDisplay('abcdefghjkmnprst')).toBe(
        'ABCD-EFGH-JKMN-PRST',
      );
    });
  });
});
