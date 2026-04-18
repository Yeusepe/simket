/**
 * Purpose: Barrel export for the BundlePlugin package.
 * Governing docs:
 *   - docs/architecture.md (§4 Product model)
 * Tests:
 *   - packages/vendure-server/src/plugins/bundle/bundle.plugin.test.ts
 */
export { BundlePlugin, bundleConfiguration, validateDiscountPercent, calculateBundlePrice } from './bundle.plugin.js';
export { BundleEntity } from './bundle.entity.js';
