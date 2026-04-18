/**
 * Purpose: Purchase parity (regional pricing) — discount resolution and application.
 *
 * Provides pure functions for resolving regional discounts by country code,
 * applying discounts to prices, and validating pricing rules. This logic is
 * I/O-free so it can be used in both the Vendure plugin and at checkout.
 *
 * Governing docs:
 *   - docs/architecture.md §7.2 (Hyperswitch fee model — regional pricing)
 *   - docs/domain-model.md §4.1 (Product pricing)
 * External references:
 *   - ISO 3166-1 alpha-2 country codes
 * Tests:
 *   - packages/vendure-server/src/plugins/purchase-parity/purchase-parity.service.test.ts
 */

import { resolveRegion, isRegionGroup } from './regions.js';
import type { RegionGroup } from './regions.js';

/** Maximum allowed regional discount percentage. */
export const MAX_DISCOUNT_PERCENT = 80;

/**
 * A single regional pricing rule — either for a specific country code
 * (e.g., "BR") or a region group (e.g., "LATAM").
 */
export interface RegionalPricingRule {
  /** ISO 3166-1 alpha-2 country code OR a RegionGroup name. */
  readonly region: string;
  /** Discount percentage (0–MAX_DISCOUNT_PERCENT, integer). */
  readonly discountPercent: number;
}

/**
 * Resolve the applicable regional discount for a buyer's country.
 *
 * Resolution order:
 * 1. Exact country code match in rules (e.g., "BR" rule for a Brazilian buyer)
 * 2. Region group match (e.g., "LATAM" rule for a Brazilian buyer)
 * 3. No match → 0% discount
 *
 * @param rules - All regional pricing rules for a product
 * @param countryCode - Buyer's ISO 3166-1 alpha-2 country code
 * @returns Discount percentage to apply (0 if no match)
 */
export function resolveRegionalDiscount(
  rules: readonly RegionalPricingRule[],
  countryCode: string,
): number {
  const normalizedCode = countryCode.toUpperCase();

  // 1. Check for exact country code match
  const countryRule = rules.find(
    (r) => r.region.toUpperCase() === normalizedCode && !isRegionGroup(r.region),
  );
  if (countryRule) {
    return countryRule.discountPercent;
  }

  // 2. Check for region group match
  const region: RegionGroup | undefined = resolveRegion(normalizedCode);
  if (region) {
    const regionRule = rules.find((r) => r.region === region);
    if (regionRule) {
      return regionRule.discountPercent;
    }
  }

  // 3. No match
  return 0;
}

/**
 * Apply a regional discount to a price in cents.
 *
 * Uses floor rounding to favor the buyer (they pay less, not more).
 *
 * @param priceCents - Original price in cents
 * @param discountPercent - Discount percentage (0–MAX_DISCOUNT_PERCENT)
 * @returns Discounted price in cents (never negative)
 */
export function applyRegionalDiscount(
  priceCents: number,
  discountPercent: number,
): number {
  if (discountPercent <= 0) return priceCents;
  if (discountPercent >= 100) return 0;
  return Math.floor(priceCents * (1 - discountPercent / 100));
}

/**
 * Validation result for a regional pricing rule.
 */
export interface RegionalPricingValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate a regional pricing rule before persisting.
 */
export function validateRegionalPricing(rule: {
  region: string;
  discountPercent: number;
}): RegionalPricingValidationResult {
  const errors: string[] = [];

  if (!rule.region || rule.region.trim().length === 0) {
    errors.push('Region must not be empty');
  }

  if (!Number.isFinite(rule.discountPercent) || !Number.isInteger(rule.discountPercent)) {
    errors.push('Discount percentage must be a finite integer');
  } else {
    if (rule.discountPercent < 0) {
      errors.push('Discount percentage must be at least 0');
    }
    if (rule.discountPercent > MAX_DISCOUNT_PERCENT) {
      errors.push(
        `Discount percentage must be at most ${MAX_DISCOUNT_PERCENT}%`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
