/**
 * Purpose: Persist product moderation reports submitted by buyers and reviewed by administrators.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 *   - docs/domain-model.md (§1 core records)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/entities
 * Tests:
 *   - packages/vendure-server/src/plugins/reporting/reporting.resolver.test.ts
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ReportPriority, ReportReason, ReportStatus } from './reporting.service.js';

@Entity('content_report')
@Index('idx_content_report_reporter_created', ['reporterId', 'createdAt'])
@Index('idx_content_report_status_priority_created', ['status', 'priority', 'createdAt'])
@Index('idx_content_report_product_created', ['productId', 'createdAt'])
export class ReportEntity {
  constructor(input?: Partial<ReportEntity>) {
    if (input) {
      Object.assign(this, input);
    }
  }

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  productId!: string;

  @Column({ type: 'varchar' })
  reporterId!: string;

  @Column({ type: 'varchar', length: 64 })
  reason!: ReportReason;

  @Column({ type: 'varchar', length: 16 })
  priority!: ReportPriority;

  @Column({ type: 'varchar', length: 32, default: 'PENDING' })
  status: ReportStatus = 'PENDING' as ReportStatus;

  @Column({ type: 'text', nullable: true, default: null })
  details: string | null = null;

  @Column({ type: 'text', nullable: true, default: null })
  adminNotes: string | null = null;

  @Column({ type: 'varchar', nullable: true, default: null })
  resolvedBy: string | null = null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  resolvedAt: Date | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
