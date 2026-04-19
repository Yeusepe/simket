/**
 * Purpose: BundleEntity — TypeORM entity for product bundles with discount pricing.
 * Governing docs:
 *   - docs/architecture.md (§4 Product model)
 *   - docs/domain-model.md (Bundle entity)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/many-to-many-relations
 * Tests:
 *   - packages/vendure-server/src/plugins/bundle/bundle.plugin.test.ts
 */
import type { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity, Product } from '@vendure/core';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';

/**
 * A Bundle groups multiple {@link Product}s together with an optional discount.
 * Extends {@link VendureEntity} which provides `id`, `createdAt`, and `updatedAt`.
 */
@Entity()
export class BundleEntity extends VendureEntity {
  constructor(input?: DeepPartial<BundleEntity>) {
    super(input);
    if (input) {
      if (input.name != null) {
        this.name = input.name as string;
      }
      if (input.description !== undefined) {
        this.description = (input.description as string | null) ?? null;
      }
      if (input.discountPercent != null) {
        this.discountPercent = input.discountPercent as number;
      }
      if (input.enabled != null) {
        this.enabled = input.enabled as boolean;
      }
      if (input.products != null) {
        this.products = input.products as Product[];
      }
    }
  }

  /** Display name for the bundle. */
  @Column({ type: 'varchar' })
  name!: string;

  /** Optional description of the bundle. */
  @Column({ type: 'text', nullable: true, default: null })
  description!: string | null;

  /** Discount percentage applied to the total of all bundled product prices (0–100). */
  @Column({ type: 'int', default: 0 })
  discountPercent!: number;

  /** Whether this bundle is currently active and visible. */
  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  /** Products included in this bundle (many-to-many). */
  @ManyToMany(() => Product)
  @JoinTable()
  products!: Product[];
}
