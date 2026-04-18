/**
 * Purpose: Public API for the purchase-parity plugin.
 *
 * Governing docs:
 *   - docs/architecture.md §7.2 (regional pricing)
 * Tests:
 *   - packages/vendure-server/src/plugins/purchase-parity/purchase-parity.service.test.ts
 */

export { PurchaseParityPlugin } from './purchase-parity.plugin.js';
export {
  resolveRegionalDiscount,
  applyRegionalDiscount,
  validateRegionalPricing,
  MAX_DISCOUNT_PERCENT,
} from './purchase-parity.service.js';
export type {
  RegionalPricingRule,
  RegionalPricingValidationResult,
} from './purchase-parity.service.js';
export {
  resolveRegion,
  isRegionGroup,
  REGION_GROUPS,
  COUNTRY_TO_REGION,
} from './regions.js';
export type { RegionGroup } from './regions.js';
