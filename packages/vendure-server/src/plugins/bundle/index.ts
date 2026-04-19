/**
 * Purpose: Barrel export for the BundlePlugin package.
 * Governing docs:
 *   - docs/architecture.md (§4 Product model)
 * Tests:
 *   - packages/vendure-server/src/plugins/bundle/bundle.plugin.test.ts
 */
export {
  BundlePlugin,
  bundleConfiguration,
  validateDiscountPercent,
  calculateBundlePrice,
  allocateBundleLinePricing,
} from './bundle.plugin.js';
export { BundleService } from './bundle.service.js';
export { BundleEntity } from './bundle.entity.js';

export type {
  BundleLinePricingInput,
  BundleLinePricing,
  BundleCartPricing,
} from './bundle.plugin.js';
