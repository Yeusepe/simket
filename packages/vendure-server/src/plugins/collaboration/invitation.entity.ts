/**
 * Purpose: Persist collaboration invitations before they become active revenue-sharing records.
 * Governing docs:
 *   - docs/architecture.md (§5 Collaboration plugin, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.6 Convex functions, §2 plugin contracts)
 *   - docs/domain-model.md (§1 Collaboration, §2 identity model)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/entities
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/invitation.service.test.ts
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { InvitationStatus } from './invitation.service.js';

@Entity('collaboration_invitation')
@Index('idx_collaboration_invitation_product', ['productId'])
@Index('idx_collaboration_invitation_invitee', ['inviteeEmail', 'status'])
@Index('uq_collaboration_invitation_token', ['token'], { unique: true })
export class InvitationEntity {
  constructor(input?: Partial<InvitationEntity>) {
    if (input) {
      Object.assign(this, input);
    }
  }

  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar' })
  productId!: string;

  @Column({ type: 'varchar' })
  inviterId!: string;

  @Column({ type: 'varchar' })
  inviteeEmail!: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  inviteeId: string | null = null;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  splitPercent!: number;

  @Column({ type: 'varchar', default: 'pending' })
  status!: InvitationStatus;

  @Column({ type: 'varchar', length: 128 })
  token!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
