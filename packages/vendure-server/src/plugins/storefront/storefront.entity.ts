/**
 * Purpose: StorePageEntity — TypeORM entity for universal and product-scoped storefront pages.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership, Storefront plugin)
 *   - docs/domain-model.md (§4.5 StorePage)
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://typeorm.io/decorator-reference#column
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/storefront.plugin.test.ts
 */
import type { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

export type StorePageScope = 'universal' | 'product';

@Entity()
@Index('idx_store_page_scope_product_slug_unique', ['scope', 'productId', 'slug'], {
  unique: true,
})
export class StorePageEntity extends VendureEntity {
  constructor(input?: DeepPartial<StorePageEntity>) {
    super(input);
  }

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar' })
  slug!: string;

  @Column({
    type: 'simple-enum',
    enum: ['universal', 'product'],
  })
  scope!: StorePageScope;

  @Column({ type: 'varchar', nullable: true, default: null })
  productId!: string | null;

  @Column({ type: 'boolean', default: false })
  isPostSale!: boolean;

  @Column({ type: 'boolean', default: false })
  isTemplate!: boolean;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;
}
