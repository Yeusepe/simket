/**
 * Purpose: Add creator ownership to storefront pages so multiple creators can
 *          publish their own `home` and `product-detail` pages safely.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, §12 source of truth)
 *   - docs/service-architecture.md (§7.7 Storefront plugin)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://typeorm.io/migrations
 * Tests:
 *   - Covered by storefront service and plugin tests
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class StorePageCreatorOwnership1713571200000 implements MigrationInterface {
  public readonly name = 'StorePageCreatorOwnership1713571200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "store_page_entity"
      ADD COLUMN IF NOT EXISTS "creatorId" character varying DEFAULT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_store_page_creator_id"
      ON "store_page_entity" ("creatorId")
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_page_scope_product_slug_unique"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_store_page_creator_scope_product_slug_unique"
      ON "store_page_entity" ("creatorId", "scope", "productId", "slug")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_page_creator_scope_product_slug_unique"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_store_page_scope_product_slug_unique"
      ON "store_page_entity" ("scope", "productId", "slug")
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_page_creator_id"`);
    await queryRunner.query(`
      ALTER TABLE "store_page_entity"
      DROP COLUMN IF EXISTS "creatorId"
    `);
  }
}
