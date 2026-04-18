/**
 * Purpose: Platform fee calculation, creator revenue splits, and recommendation boost.
 *
 * The platform takes a configurable percentage (min 5%) of each sale. Higher take
 * rates give products a proportional boost in the recommendation pipeline. This
 * module provides pure functions — no I/O, no Vendure imports — so it can be used
 * by both the Vendure plugin and the recommend-service.
 *
 * Governing docs:
 *   - docs/architecture.md §7.2 (Hyperswitch fee model)
 *   - docs/service-architecture.md §1.13 (Payment API contract)
 *   - docs/domain-model.md §4.1 (Product.platformTakeRate)
 * External references:
 *   - https://api-reference.hyperswitch.io/api-reference/payments/payments--create
 * Tests:
 *   - packages/vendure-server/src/plugins/platform-fee/platform-fee.service.test.ts
 */

/** Minimum platform take rate: 5%. */
export const MIN_TAKE_RATE = 5;

/** Maximum platform take rate: 100%. */
export const MAX_TAKE_RATE = 100;

/**
 * Minimum price in cents for paid products.
 * Free products (0 cents) are allowed. This prevents micro-pricing that doesn't
 * cover per-transaction costs (e.g., 30-cent card network fees).
 */
export const MIN_PRICE_CENTS = 100; // $1.00

/**
 * Calculate the platform fee in cents for a sale.
 *
 * Uses ceiling rounding so the platform always receives at least the correct
 * proportion (never under-charges due to rounding).
 *
 * @param priceCents - Product price in cents (must be positive integer)
 * @param takeRate - Platform take rate as a percentage (5–100)
 * @returns Fee in cents (always integer, rounded up)
 */
export function calculatePlatformFee(
  priceCents: number,
  takeRate: number,
): number {
  if (!Number.isInteger(priceCents) || priceCents <= 0) {
    throw new RangeError('Price must be a positive integer (cents)');
  }
  if (takeRate < MIN_TAKE_RATE || takeRate > MAX_TAKE_RATE) {
    throw new RangeError(
      `Take rate must be between ${MIN_TAKE_RATE}% and ${MAX_TAKE_RATE}%`,
    );
  }
  return Math.ceil(priceCents * (takeRate / 100));
}

/**
 * Calculate creator revenue after platform fee.
 *
 * Invariant: `calculatePlatformFee(p, r) + calculateCreatorRevenue(p, r) === p`
 *
 * @param priceCents - Product price in cents
 * @param takeRate - Platform take rate (5–100)
 * @returns Creator's share in cents
 */
export function calculateCreatorRevenue(
  priceCents: number,
  takeRate: number,
): number {
  return priceCents - calculatePlatformFee(priceCents, takeRate);
}

/**
 * Compute the recommendation boost multiplier based on take rate.
 *
 * Formula: `boost = 1.0 + (takeRate - MIN_TAKE_RATE) × 0.1`
 *
 * At 5%  → 1.0× (no boost — baseline)
 * At 10% → 1.5×
 * At 15% → 2.0×
 * At 100% → 10.5×
 *
 * This multiplier is applied in the recommendation pipeline's TakeRateBoostRanker.
 *
 * @param takeRate - Platform take rate (5–100)
 * @returns Boost multiplier (≥ 1.0)
 */
export function getRecommendationBoost(takeRate: number): number {
  if (takeRate < MIN_TAKE_RATE || takeRate > MAX_TAKE_RATE) {
    throw new RangeError(
      `Take rate must be between ${MIN_TAKE_RATE}% and ${MAX_TAKE_RATE}%`,
    );
  }
  return 1.0 + (takeRate - MIN_TAKE_RATE) * 0.1;
}

/**
 * Validation result for fee configuration.
 */
export interface FeeValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate a fee configuration before applying it.
 *
 * Rules:
 * - Take rate must be integer in [MIN_TAKE_RATE, MAX_TAKE_RATE]
 * - Price must be 0 (free) or ≥ MIN_PRICE_CENTS
 */
export function validateFeeConfiguration(config: {
  takeRate: number;
  priceCents: number;
}): FeeValidationResult {
  const errors: string[] = [];

  if (!Number.isFinite(config.takeRate) || !Number.isInteger(config.takeRate)) {
    errors.push('Take rate must be an integer');
  } else {
    if (config.takeRate < MIN_TAKE_RATE) {
      errors.push(`Take rate must be at least ${MIN_TAKE_RATE}%`);
    }
    if (config.takeRate > MAX_TAKE_RATE) {
      errors.push(`Take rate must be at most ${MAX_TAKE_RATE}%`);
    }
  }

  if (config.priceCents !== 0 && config.priceCents < MIN_PRICE_CENTS) {
    errors.push(
      `Price must be at least ${MIN_PRICE_CENTS} cents ($${(MIN_PRICE_CENTS / 100).toFixed(2)})`,
    );
  }

  return { valid: errors.length === 0, errors };
}
