/**
 * Purpose: Persist saved products per customer for the storefront wishlist feature.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/domain-model.md (§1 core records)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/entities
 * Tests:
 *   - packages/vendure-server/src/plugins/wishlist/wishlist.service.test.ts
 */
import { DeepPartial } from '@vendure/common/lib/shared-types';
import { Customer, Product, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

@Entity('wishlist_item')
@Unique('uq_wishlist_customer_product', ['customerId', 'productId'])
@Index('idx_wishlist_customer_added', ['customerId', 'addedAt'])
export class WishlistItem extends VendureEntity {
  constructor(input?: DeepPartial<WishlistItem>) {
    super(input);
  }

  @Column({ type: 'varchar' })
  customerId!: string;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Column({ type: 'varchar' })
  productId!: string;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'timestamp' })
  addedAt!: Date;

  @Column({ type: 'boolean', default: false })
  notifyOnPriceDrop!: boolean;
}
