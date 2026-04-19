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
  platformFeeAdminApiExtensions,
  platformFeeShopApiExtensions,
  PlatformFeeAdminResolver,
  PlatformFeeShopResolver,
} from './platform-fee.api.js';
export {
  PlatformFeeService,
  calculatePlatformFee,
  calculateCreatorRevenue,
  getRecommendationBoost,
  validateFeeConfiguration,
  MIN_TAKE_RATE,
  MAX_TAKE_RATE,
  MIN_PRICE_CENTS,
} from './platform-fee.service.js';
export type {
  FeeValidationResult,
  PlatformFeeSummary,
  PlatformFeeDefaults,
} from './platform-fee.service.js';
