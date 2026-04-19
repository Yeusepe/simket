/**
 * Purpose: Shared gift plugin types used by persistence, services, and GraphQL APIs.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 * Tests:
 *   - packages/vendure-server/src/plugins/gifts/gift.service.test.ts
 *   - packages/vendure-server/src/plugins/gifts\gift.resolver.test.ts
 */
export enum GiftStatus {
  /** Gift purchased but not yet claimed by recipient. */
  PURCHASED = 'PURCHASED',
  /** Gift claimed by recipient — entitlement granted. */
  CLAIMED = 'CLAIMED',
  /** Gift revoked (e.g., refund, fraud). */
  REVOKED = 'REVOKED',
  /** Gift expired (time-limited gifts only). */
  EXPIRED = 'EXPIRED',
}

export interface GiftRecord {
  readonly id: string;
  readonly giftCode: string;
  readonly productId: string;
  readonly senderUserId: string;
  readonly recipientEmail: string;
  readonly recipientUserId: string | null;
  readonly status: GiftStatus;
  readonly claimedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface GiftFilter {
  readonly status?: string | null;
  readonly recipientEmail?: string | null;
  readonly senderUserId?: string | null;
  readonly recipientUserId?: string | null;
  readonly productId?: string | null;
}
