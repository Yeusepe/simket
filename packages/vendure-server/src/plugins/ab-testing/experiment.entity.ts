/**
 * Purpose: Persist creator-owned AB testing experiments and variant outcome events.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/entities
 * Tests:
 *   - packages/vendure-server/src/plugins/ab-testing/ab-testing.service.test.ts
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const EXPERIMENT_STATUSES = ['draft', 'running', 'completed', 'archived'] as const;
export const EXPERIMENT_EVENTS = ['view', 'click', 'purchase'] as const;

export type ExperimentStatus = typeof EXPERIMENT_STATUSES[number];
export type ExperimentEvent = typeof EXPERIMENT_EVENTS[number];

export interface ExperimentVariantDefinition {
  readonly name: string;
  readonly weight: number;
  readonly config: Record<string, unknown>;
}

export interface ExperimentAudienceRules {
  readonly mode?: 'all-users' | 'segment';
  readonly regions?: readonly string[];
  readonly minPurchases?: number;
  readonly maxPurchases?: number;
  readonly purchasedProductIds?: readonly string[];
}

@Entity('experiment')
@Index('idx_experiment_creator_status', ['creatorId', 'status'])
@Index('idx_experiment_product_status', ['productId', 'status'])
export class ExperimentEntity {
  constructor(input?: Partial<ExperimentEntity>) {
    if (input) {
      Object.assign(this, input);
    }
  }

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null = null;

  @Column({ type: 'varchar', nullable: true, default: null })
  productId: string | null = null;

  @Column({ type: 'varchar' })
  creatorId!: string;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status: ExperimentStatus = 'draft';

  @Column({ type: 'jsonb' })
  variants!: ExperimentVariantDefinition[];

  @Column({ type: 'jsonb', nullable: true, default: () => "'{}'" })
  audienceRules: ExperimentAudienceRules = { mode: 'all-users' };

  @Column({ type: 'datetime', nullable: true, default: null })
  startDate: Date | null = null;

  @Column({ type: 'datetime', nullable: true, default: null })
  endDate: Date | null = null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}

@Entity('experiment_result')
@Index('idx_experiment_result_experiment_variant', ['experimentId', 'variantName'])
@Index('idx_experiment_result_experiment_event', ['experimentId', 'event'])
export class ExperimentResultEntity {
  constructor(input?: Partial<ExperimentResultEntity>) {
    if (input) {
      Object.assign(this, input);
    }
  }

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  experimentId!: string;

  @Column({ type: 'varchar' })
  variantName!: string;

  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  event!: ExperimentEvent;

  @Column({ type: 'jsonb', nullable: true, default: null })
  metadata: Record<string, unknown> | null = null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}

export function isExperimentStatus(value: string): value is ExperimentStatus {
  return EXPERIMENT_STATUSES.includes(value as ExperimentStatus);
}

export function isExperimentEvent(value: string): value is ExperimentEvent {
  return EXPERIMENT_EVENTS.includes(value as ExperimentEvent);
}
