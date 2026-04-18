/**
 * Purpose: Public API for the platform-fee plugin.
 *
 * Re-exports all pure functions and the Vendure plugin class.
 *
 * Governing docs:
 *   - docs/architecture.md §7.2 (Hyperswitch fee model)
 * Tests:
 *   - packages/vendure-server/src/plugins/platform-fee/platform-fee.service.test.ts
 */

export { PlatformFeePlugin } from './platform-fee.plugin.js';
export {
  calculatePlatformFee,
  calculateCreatorRevenue,
  getRecommendationBoost,
  validateFeeConfiguration,
  MIN_TAKE_RATE,
  MAX_TAKE_RATE,
  MIN_PRICE_CENTS,
} from './platform-fee.service.js';
export type { FeeValidationResult } from './platform-fee.service.js';
