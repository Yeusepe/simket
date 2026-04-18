/**
 * Purpose: DependencyEntity — TypeORM entity for product prerequisite rules and
 * optional discounts when required products are already owned.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/entities
 * Tests:
 *   - packages/vendure-server/src/plugins/dependency/dependency.plugin.test.ts
 */
import type { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';

/**
 * Stores a dependency rule for a product.
 *
 * `productId` is the product being purchased and `requiredProductId` is the
 * product that must already be owned by the customer.
 */
@Entity()
export class DependencyEntity extends VendureEntity {
  constructor(input?: DeepPartial<DependencyEntity>) {
    super(input);
    if (input) {
      if (input.productId != null) {
        this.productId = input.productId as string;
      }
      if (input.requiredProductId != null) {
        this.requiredProductId = input.requiredProductId as string;
      }
      if (input.discountPercent != null) {
        this.discountPercent = input.discountPercent as number;
      }
      if (input.enabled != null) {
        this.enabled = input.enabled as boolean;
      }
      if (input.message !== undefined) {
        this.message = (input.message as string | null) ?? null;
      }
    }
  }

  /** The product that has a prerequisite. */
  @Column({ type: 'varchar' })
  productId!: string;

  /** The product that must already be owned. */
  @Column({ type: 'varchar' })
  requiredProductId!: string;

  /** Optional discount percentage granted when the prerequisite is owned. */
  @Column({ type: 'int', default: 0 })
  discountPercent = 0;

  /** Whether this dependency rule is active. */
  @Column({ type: 'boolean', default: true })
  enabled = true;

  /** Optional storefront message explaining the prerequisite. */
  @Column({ type: 'text', nullable: true, default: null })
  message: string | null = null;
}
