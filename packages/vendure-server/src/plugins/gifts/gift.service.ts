/**
 * Purpose: Gift code generation, validation, and status management.
 *
 * All functions are pure/IO-free for testability. The plugin layer
 * handles persistence (Vendure entities) and event publishing.
 *
 * Governing docs:
 *   - docs/architecture.md §4.3 (Orders and entitlements)
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/custom-fields/
 * Tests:
 *   - packages/vendure-server/src/plugins/gifts/gift.service.test.ts
 */

import { randomBytes } from 'node:crypto';

/**
 * Gift lifecycle states.
 */
export enum GiftStatus {
  /** Gift purchased but not yet claimed by recipient. */
  PURCHASED = 'PURCHASED',
  /** Gift claimed by recipient — entitlement granted. */
  CLAIMED = 'CLAIMED',
  /** Gift revoked (e.g., refund, fraud). */
  REVOKED = 'REVOKED',
  /** Gift expired (time-limited gifts only). */
  EXPIRED = 'EXPIRED',
}

/**
 * Characters used in gift codes. Ambiguous characters (0, O, I, 1, L) are
 * excluded to improve readability when sharing codes.
 */
const GIFT_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 16;
const GROUP_SIZE = 4;

/**
 * Generate a cryptographically random gift code.
 *
 * Format: XXXX-XXXX-XXXX-XXXX (16 alphanumeric chars, grouped by 4)
 * Alphabet excludes: 0, O, I, 1, L (ambiguous characters)
 *
 * @returns Formatted gift code string
 */
export function generateGiftCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let raw = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    raw += GIFT_CODE_ALPHABET[bytes[i] % GIFT_CODE_ALPHABET.length];
  }
  return formatGiftCodeForDisplay(raw);
}

/**
 * Validate a gift code format. Does NOT check if the code exists in the database.
 */
export function validateGiftCode(code: string): {
  valid: boolean;
  error?: string;
  normalizedCode?: string;
} {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'Gift code must not be empty' };
  }

  const normalized = code.toUpperCase().replace(/-/g, '');

  if (normalized.length !== CODE_LENGTH) {
    return {
      valid: false,
      error: `Gift code must be ${CODE_LENGTH} characters (got ${normalized.length})`,
    };
  }

  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return { valid: false, error: 'Gift code contains invalid characters' };
  }

  return { valid: true, normalizedCode: normalized };
}

/**
 * Check if a gift in the given status can be claimed.
 */
export function isGiftClaimable(status: GiftStatus): boolean {
  return status === GiftStatus.PURCHASED;
}

/**
 * Format a raw gift code string with hyphens for display.
 *
 * @param code - Raw or formatted code (hyphens are stripped first)
 * @returns Formatted code: XXXX-XXXX-XXXX-XXXX
 */
export function formatGiftCodeForDisplay(code: string): string {
  const raw = code.toUpperCase().replace(/-/g, '');
  const groups: string[] = [];
  for (let i = 0; i < raw.length; i += GROUP_SIZE) {
    groups.push(raw.slice(i, i + GROUP_SIZE));
  }
  return groups.join('-');
}
