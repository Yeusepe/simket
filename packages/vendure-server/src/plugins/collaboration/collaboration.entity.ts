/**
 * Purpose: CollaborationEntity — TypeORM entity for revenue-sharing collaborations between creators.
 * Governing docs:
 *   - docs/architecture.md (§4 Collaboration model)
 *   - docs/domain-model.md (Collaboration entity, state machine)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/entities
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/collaboration.plugin.test.ts
 */
import type { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';

/**
 * Collaboration lifecycle states.
 *
 * State machine:
 *   Pending → Invited → Active → Revoked
 *                  ↘ Revoked     (cancel invitation)
 *          ↘ Revoked             (cancel before sending)
 *
 * Revoked is a terminal state with no outbound transitions.
 */
export enum CollaborationStatus {
  /** Draft — collaboration created but invitation not yet sent */
  Pending = 'pending',
  /** Invitation sent to the target creator */
  Invited = 'invited',
  /** Creator accepted — revenue sharing is live */
  Active = 'active',
  /** Terminated — no further transitions allowed */
  Revoked = 'revoked',
}

/**
 * Represents a revenue-sharing collaboration between two creators on a product.
 *
 * Uses string columns (not relations) for productId, creatorId, and ownerCreatorId
 * to avoid requiring a full Vendure bootstrap for unit testing and to decouple
 * from the specific ID strategy.
 */
@Entity()
export class CollaborationEntity extends VendureEntity {
  constructor(input?: DeepPartial<CollaborationEntity>) {
    super(input);
    if (input) {
      if (input.productId != null) this.productId = input.productId as string;
      if (input.creatorId != null) this.creatorId = input.creatorId as string;
      if (input.ownerCreatorId != null) this.ownerCreatorId = input.ownerCreatorId as string;
      if (input.revenueSharePercent != null)
        this.revenueSharePercent = input.revenueSharePercent as number;
      this.status = (input.status as CollaborationStatus) ?? CollaborationStatus.Pending;
    }
  }

  /** The product this collaboration applies to */
  @Column({ type: 'varchar' })
  productId!: string;

  /** The invited collaborator's creator ID */
  @Column({ type: 'varchar' })
  creatorId!: string;

  /** The product owner's creator ID */
  @Column({ type: 'varchar' })
  ownerCreatorId!: string;

  /** Revenue share percentage for the invited creator (0–100) */
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  revenueSharePercent!: number;

  /** Current lifecycle status */
  @Column({ type: 'varchar', default: CollaborationStatus.Pending })
  status: CollaborationStatus = CollaborationStatus.Pending;
}
