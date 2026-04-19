/**
 * Purpose: Persist creator settlement obligations generated from collaborative orders.
 * Governing docs:
 *   - docs/architecture.md (§2, §5, §6 purchase flow)
 *   - docs/service-architecture.md (§1.6 Convex functions, §5 service ownership)
 *   - docs/domain-model.md (§1 core records, §4.4 Collaboration)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/entities
 *   - https://stripe.com/docs/connect/separate-charges-and-transfers
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/settlement.service.test.ts
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SettlementStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

@Entity('collaboration_settlement')
@Index('idx_collaboration_settlement_order', ['orderId', 'status'])
@Index('idx_collaboration_settlement_creator', ['creatorId', 'status'])
@Index('uq_collaboration_settlement_line_creator', ['orderLineId', 'creatorId'], { unique: true })
export class SettlementEntity {
  constructor(input?: Partial<SettlementEntity>) {
    if (input) {
      Object.assign(this, input);
    }
  }

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  orderId!: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  orderCode: string | null = null;

  @Column({ type: 'varchar' })
  orderLineId!: string;

  @Column({ type: 'varchar' })
  productId!: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  productName: string | null = null;

  @Column({ type: 'varchar' })
  creatorId!: string;

  @Column({ type: 'varchar' })
  ownerCreatorId!: string;

  @Column({ type: 'varchar' })
  stripeAccountId!: string;

  @Column({ type: 'varchar', length: 3 })
  currencyCode!: string;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  sharePercent!: number;

  @Column({ type: 'varchar', default: SettlementStatus.Pending })
  status: SettlementStatus = SettlementStatus.Pending;

  @Column({ type: 'int', default: 0 })
  attemptCount = 0;

  @Column({ type: 'varchar', nullable: true, default: null })
  transferGroup: string | null = null;

  @Column({ type: 'varchar', nullable: true, default: null })
  sourceTransactionId: string | null = null;

  @Column({ type: 'varchar', nullable: true, default: null })
  paymentReference: string | null = null;

  @Column({ type: 'varchar', length: 2048, nullable: true, default: null })
  failureMessage: string | null = null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  processedAt: Date | null = null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  failedAt: Date | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
