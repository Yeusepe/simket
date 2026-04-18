/**
 * Purpose: TypeORM entity for persisted asset references and soft-delete orphan cleanup windows.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/entities
 * Tests:
 *   - packages/vendure-server/src/features/asset-refs/asset-ref.service.test.ts
 */
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { EntityType, RefType } from './asset-ref.types.js';

@Entity('asset_reference')
@Index('idx_asset_reference_asset_id', ['assetId'])
@Index('idx_asset_reference_entity', ['entityType', 'entityId'])
@Index('uq_asset_reference_asset_entity_ref', ['assetId', 'entityType', 'entityId', 'refType'], {
  unique: true,
})
export class AssetRefEntity {
  constructor(input?: Partial<AssetRefEntity>) {
    if (input) {
      Object.assign(this, input);
    }
  }

  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar' })
  assetId!: string;

  @Column({ type: 'varchar' })
  entityType!: EntityType;

  @Column({ type: 'varchar' })
  entityId!: string;

  @Column({ type: 'varchar' })
  refType!: RefType;

  @Column({ type: 'int', default: 1 })
  version = 1;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'datetime', nullable: true, default: null })
  deletedAt: Date | null = null;
}
