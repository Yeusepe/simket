/**
 * Purpose: Create all custom Vendure plugin tables and indexes without relying on synchronize.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://typeorm.io/migrations
 *   - https://typeorm.io/entities
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 * Tests:
 *   - packages/vendure-server/src/migrations/1713484800000-initial-custom-entities.test.ts
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCustomEntities1713484800000 implements MigrationInterface {
  public readonly name = 'InitialCustomEntities1713484800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "bundle_entity" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "name" character varying NOT NULL,
        "description" text DEFAULT NULL,
        "discountPercent" integer NOT NULL DEFAULT 0,
        "enabled" boolean NOT NULL DEFAULT true,
        CONSTRAINT "CHK_bundle_entity_discount_percent" CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100),
        CONSTRAINT "PK_bundle_entity_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "bundle_entity_products_product" (
        "bundleEntityId" integer NOT NULL,
        "productId" integer NOT NULL,
        CONSTRAINT "PK_bundle_entity_products_product" PRIMARY KEY ("bundleEntityId", "productId"),
        CONSTRAINT "FK_bundle_products_bundle" FOREIGN KEY ("bundleEntityId") REFERENCES "bundle_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_bundle_products_product" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_bundle_entity_products_product_product_id"
      ON "bundle_entity_products_product" ("productId")
    `);

    await queryRunner.query(`
      CREATE TABLE "dependency_entity" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "productId" character varying NOT NULL,
        "requiredProductId" character varying NOT NULL,
        "discountPercent" integer NOT NULL DEFAULT 0,
        "enabled" boolean NOT NULL DEFAULT true,
        "message" text DEFAULT NULL,
        CONSTRAINT "CHK_dependency_entity_discount_percent" CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100),
        CONSTRAINT "PK_dependency_entity_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_dependency_entity_product_enabled"
      ON "dependency_entity" ("productId", "enabled")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_dependency_entity_required_product"
      ON "dependency_entity" ("requiredProductId")
    `);

    await queryRunner.query(`
      CREATE TABLE "collaboration_entity" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "productId" character varying NOT NULL,
        "creatorId" character varying NOT NULL,
        "ownerCreatorId" character varying NOT NULL,
        "revenueSharePercent" numeric(5,2) NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        CONSTRAINT "CHK_collaboration_entity_revenue_share" CHECK ("revenueSharePercent" > 0 AND "revenueSharePercent" <= 100),
        CONSTRAINT "CHK_collaboration_entity_status" CHECK ("status" IN ('pending', 'invited', 'active', 'revoked')),
        CONSTRAINT "PK_collaboration_entity_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_collaboration_entity_product_status"
      ON "collaboration_entity" ("productId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_collaboration_entity_creator_status"
      ON "collaboration_entity" ("creatorId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "collaboration_invitation" (
        "id" character varying(36) NOT NULL,
        "productId" character varying NOT NULL,
        "inviterId" character varying NOT NULL,
        "inviteeEmail" character varying NOT NULL,
        "inviteeId" character varying DEFAULT NULL,
        "splitPercent" numeric(5,2) NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "token" character varying(128) NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_collaboration_invitation_split_percent" CHECK ("splitPercent" > 0 AND "splitPercent" <= 100),
        CONSTRAINT "CHK_collaboration_invitation_status" CHECK ("status" IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
        CONSTRAINT "PK_collaboration_invitation_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_collaboration_invitation_token" UNIQUE ("token")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_collaboration_invitation_product"
      ON "collaboration_invitation" ("productId")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_collaboration_invitation_invitee"
      ON "collaboration_invitation" ("inviteeEmail", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "collaboration_settlement" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "orderId" character varying NOT NULL,
        "orderCode" character varying DEFAULT NULL,
        "orderLineId" character varying NOT NULL,
        "productId" character varying NOT NULL,
        "productName" character varying DEFAULT NULL,
        "creatorId" character varying NOT NULL,
        "ownerCreatorId" character varying NOT NULL,
        "stripeAccountId" character varying NOT NULL,
        "currencyCode" character varying(3) NOT NULL,
        "amount" integer NOT NULL,
        "sharePercent" numeric(5,2) NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "attemptCount" integer NOT NULL DEFAULT 0,
        "transferGroup" character varying DEFAULT NULL,
        "sourceTransactionId" character varying DEFAULT NULL,
        "paymentReference" character varying DEFAULT NULL,
        "failureMessage" character varying(2048) DEFAULT NULL,
        "processedAt" TIMESTAMPTZ DEFAULT NULL,
        "failedAt" TIMESTAMPTZ DEFAULT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_collaboration_settlement_share_percent" CHECK ("sharePercent" > 0 AND "sharePercent" <= 100),
        CONSTRAINT "CHK_collaboration_settlement_status" CHECK ("status" IN ('pending', 'processing', 'completed', 'failed')),
        CONSTRAINT "PK_collaboration_settlement_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_collaboration_settlement_line_creator" UNIQUE ("orderLineId", "creatorId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_collaboration_settlement_order"
      ON "collaboration_settlement" ("orderId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_collaboration_settlement_creator"
      ON "collaboration_settlement" ("creatorId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "notification" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recipientId" character varying NOT NULL,
        "type" character varying(64) NOT NULL,
        "title" character varying(255) NOT NULL,
        "body" text NOT NULL,
        "data" jsonb DEFAULT NULL,
        "read" boolean NOT NULL DEFAULT false,
        "readAt" TIMESTAMPTZ DEFAULT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_notification_type" CHECK ("type" IN ('purchase', 'collaboration_invite', 'collaboration_accepted', 'product_update', 'price_drop', 'system', 'gift_received', 'review', 'settlement')),
        CONSTRAINT "PK_notification_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notification_recipient_created"
      ON "notification" ("recipientId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notification_recipient_read_created"
      ON "notification" ("recipientId", "read", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notification_recipient_type_created"
      ON "notification" ("recipientId", "type", "createdAt")
    `);

    await queryRunner.query(`
      CREATE TABLE "store_page_entity" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "title" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "scope" character varying NOT NULL,
        "productId" character varying DEFAULT NULL,
        "isPostSale" boolean NOT NULL DEFAULT false,
        "isTemplate" boolean NOT NULL DEFAULT false,
        "content" text NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "enabled" boolean NOT NULL DEFAULT true,
        CONSTRAINT "CHK_store_page_entity_scope" CHECK ("scope" IN ('universal', 'product')),
        CONSTRAINT "PK_store_page_entity_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_store_page_scope_product_slug_unique"
      ON "store_page_entity" ("scope", "productId", "slug")
    `);

    await queryRunner.query(`
      CREATE TABLE "template_entity" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "name" character varying NOT NULL,
        "description" text DEFAULT NULL,
        "thumbnail" character varying DEFAULT NULL,
        "category" character varying NOT NULL,
        "blocks" text NOT NULL,
        "isSystem" boolean NOT NULL DEFAULT false,
        "creatorId" character varying DEFAULT NULL,
        "usageCount" integer NOT NULL DEFAULT 0,
        CONSTRAINT "CHK_template_entity_category" CHECK ("category" IN ('store-page', 'product-page', 'landing-page')),
        CONSTRAINT "PK_template_entity_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_storefront_template_category"
      ON "template_entity" ("category")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_storefront_template_creator_id"
      ON "template_entity" ("creatorId")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_storefront_template_system_category"
      ON "template_entity" ("isSystem", "category")
    `);

    await queryRunner.query(`
      CREATE TABLE "wishlist_item" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "customerId" integer NOT NULL,
        "productId" integer NOT NULL,
        "addedAt" TIMESTAMPTZ NOT NULL,
        "notifyOnPriceDrop" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_wishlist_item_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_wishlist_customer_product" UNIQUE ("customerId", "productId"),
        CONSTRAINT "FK_wishlist_item_customer" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_wishlist_item_product" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_wishlist_customer_added"
      ON "wishlist_item" ("customerId", "addedAt")
    `);

    await queryRunner.query(`
      CREATE TABLE "experiment" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "description" text DEFAULT NULL,
        "productId" character varying DEFAULT NULL,
        "creatorId" character varying NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'draft',
        "variants" jsonb NOT NULL,
        "audienceRules" jsonb DEFAULT '{}'::jsonb,
        "startDate" TIMESTAMPTZ DEFAULT NULL,
        "endDate" TIMESTAMPTZ DEFAULT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_experiment_status" CHECK ("status" IN ('draft', 'running', 'completed', 'archived')),
        CONSTRAINT "PK_experiment_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_experiment_creator_status"
      ON "experiment" ("creatorId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_experiment_product_status"
      ON "experiment" ("productId", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE "experiment_result" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "experimentId" uuid NOT NULL,
        "variantName" character varying NOT NULL,
        "userId" character varying NOT NULL,
        "event" character varying(32) NOT NULL,
        "metadata" jsonb DEFAULT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_experiment_result_event" CHECK ("event" IN ('view', 'click', 'purchase')),
        CONSTRAINT "PK_experiment_result_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_experiment_result_experiment" FOREIGN KEY ("experimentId") REFERENCES "experiment"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_experiment_result_experiment_variant"
      ON "experiment_result" ("experimentId", "variantName")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_experiment_result_experiment_event"
      ON "experiment_result" ("experimentId", "event")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_experiment_result_experiment_event"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_experiment_result_experiment_variant"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "experiment_result"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_experiment_product_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_experiment_creator_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "experiment"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wishlist_customer_added"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wishlist_item"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_storefront_template_system_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_storefront_template_creator_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_storefront_template_category"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "template_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_page_scope_product_slug_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_page_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notification_recipient_type_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notification_recipient_read_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notification_recipient_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_collaboration_settlement_creator"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_collaboration_settlement_order"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "collaboration_settlement"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_collaboration_invitation_invitee"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_collaboration_invitation_product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "collaboration_invitation"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_collaboration_entity_creator_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_collaboration_entity_product_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "collaboration_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dependency_entity_required_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dependency_entity_product_enabled"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dependency_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_entity_products_product_product_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bundle_entity_products_product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bundle_entity"`);
  }
}
