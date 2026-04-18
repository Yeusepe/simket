/**
 * Purpose: Public API for the product-metadata plugin.
 *
 * Governing docs:
 *   - docs/architecture.md §4.1 (Product entity)
 * Tests:
 *   - packages/vendure-server/src/plugins/product-metadata/product-metadata.service.test.ts
 */

export { ProductMetadataPlugin, productMetadataConfiguration } from './product-metadata.plugin.js';
export {
  validateTryAvatarUrl,
  parseCompatibilityFlags,
  validateCompatibilityFlags,
  clampAvatarRanking,
  KNOWN_COMPATIBILITY_FLAGS,
} from './product-metadata.service.js';
