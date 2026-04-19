/**
 * Purpose: Persist generated gifts and gift claims for buyer gifting flows.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/entities
 * Tests:
 *   - packages/vendure-server/src/plugins/gifts/gift.resolver.test.ts
 */
import type { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

@Entity()
export class GiftEntity extends VendureEntity {
  constructor(input?: DeepPartial<GiftEntity>) {
    super(input);
  }

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  giftCode!: string;

  @Column({ type: 'varchar' })
  productId!: string;

  @Column({ type: 'varchar' })
  senderUserId!: string;

  @Column({ type: 'varchar' })
  recipientEmail!: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  recipientUserId: string | null = null;

  @Column({ type: 'varchar' })
  status!: string;

  @Column({ type: 'timestamp', nullable: true, default: null })
  claimedAt: Date | null = null;
}
