/**
 * Purpose: TemplateEntity — persisted storefront page templates for system and creator-owned builder presets.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership, Storefront plugin)
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/domain-model.md (§1 Core records, Storefront Template)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/decorator-reference#column
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/template.service.test.ts
 *   - packages/vendure-server/src/plugins/storefront/template.resolver.test.ts
 */
import type { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

export type TemplateCategory = 'store-page' | 'product-page' | 'landing-page';

export type TemplateBlock = Record<string, unknown>;

export type TemplateBlocksDocument = readonly TemplateBlock[];

@Entity()
@Index('idx_storefront_template_category', ['category'])
@Index('idx_storefront_template_creator_id', ['creatorId'])
@Index('idx_storefront_template_system_category', ['isSystem', 'category'])
export class TemplateEntity extends VendureEntity {
  constructor(input?: DeepPartial<TemplateEntity>) {
    super(input);
  }

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true, default: null })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  thumbnail!: string | null;

  @Column({
    type: 'simple-enum',
    enum: ['store-page', 'product-page', 'landing-page'],
  })
  category!: TemplateCategory;

  @Column({ type: 'simple-json' })
  blocks!: TemplateBlocksDocument;

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'varchar', nullable: true, default: null })
  creatorId!: string | null;

  @Column({ type: 'int', default: 0 })
  usageCount!: number;
}
