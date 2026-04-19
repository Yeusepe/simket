/**
 * Purpose: Persist standalone order settlement lifecycle records for payout processing.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, §6 lifecycle flows)
 *   - docs/service-architecture.md (§1.13 Hyperswitch)
 *   - docs/domain-model.md (§1 core records)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/entities
 * Tests:
 *   - packages/vendure-server/src/plugins/settlement/settlement.resolver.test.ts
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrderSettlementStatus {
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
}

@Entity('order_settlement')
@Index('idx_order_settlement_order', ['orderId'], { unique: true })
@Index('idx_order_settlement_status_created', ['status', 'createdAt'])
export class OrderSettlementEntity {
  constructor(input?: Partial<OrderSettlementEntity>) {
    if (input) {
      Object.assign(this, input);
    }
  }

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  orderId!: string;

  @Column({ type: 'varchar' })
  orderCode!: string;

  @Column({ type: 'int', default: 0 })
  amountCents = 0;

  @Column({ type: 'varchar', length: 16, default: 'USD' })
  currencyCode = 'USD';

  @Column({ type: 'varchar', length: 32, default: OrderSettlementStatus.Pending })
  status: OrderSettlementStatus = OrderSettlementStatus.Pending;

  @Column({ type: 'int', default: 0 })
  retryCount = 0;

  @Column({ type: 'text', nullable: true, default: null })
  lastError: string | null = null;

  @Column({ type: 'jsonb', nullable: true, default: null })
  payoutMetadata: Record<string, unknown> | null = null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  processedAt: Date | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
