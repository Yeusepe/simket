/**
 * Purpose: Public API for the gifts plugin.
 *
 * Governing docs:
 *   - docs/architecture.md §4.3 (Orders and entitlements)
 * Tests:
 *   - packages/vendure-server/src/plugins/gifts/gift.service.test.ts
 */

export { GiftPlugin } from './gift.plugin.js';
export {
  generateGiftCode,
  validateGiftCode,
  isGiftClaimable,
  formatGiftCodeForDisplay,
  GiftStatus,
} from './gift.service.js';
