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
  GiftService,
  generateGiftCode,
  validateGiftCode,
  isGiftClaimable,
  formatGiftCodeForDisplay,
  GiftStatus,
} from './gift.service.js';
export { GiftEntity } from './gift.entity.js';
export type { GiftFilter, GiftRecord } from './gift.types.js';
