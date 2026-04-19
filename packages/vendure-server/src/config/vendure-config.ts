import { VendureConfig } from '@vendure/core';
import path from 'node:path';
import { AbTestingPlugin } from '../plugins/ab-testing/index.js';
import { BundlePlugin } from '../plugins/bundle/index.js';
import { CatalogPlugin } from '../plugins/catalog/index.js';
import { CheckoutPlugin } from '../plugins/checkout/index.js';
import { CollaborationPlugin } from '../plugins/collaboration/index.js';
import { DependencyPlugin } from '../plugins/dependency/index.js';
import { EmailNotificationsPlugin } from '../plugins/email-notifications/index.js';
import { GiftPlugin } from '../plugins/gifts/index.js';
import { NotificationPlugin } from '../plugins/notification/index.js';
import { PaymentWebhookPlugin } from '../plugins/payment-webhook/index.js';
import { PlatformFeePlugin } from '../plugins/platform-fee/index.js';
import { ProductMetadataPlugin } from '../plugins/product-metadata/index.js';
import { PurchaseParityPlugin } from '../plugins/purchase-parity/index.js';
import { ReportingPlugin } from '../plugins/reporting/index.js';
import { SearchSyncPlugin } from '../plugins/search/index.js';
import { SettlementPlugin } from '../plugins/settlement/index.js';
import { StorefrontPlugin } from '../plugins/storefront/index.js';
import { StoreRoutingPlugin } from '../plugins/store-routing/index.js';
import { WishlistPlugin } from '../plugins/wishlist/index.js';

/**
 * Core Vendure configuration.
 *
 * DB connects through PgBouncer (port 6432) in transaction pooling mode.
 * Job queue uses BullMQ backed by the Redis queue cluster (port 6380).
 * Plugins are registered individually — this file stays lean.
 *
 * @see https://docs.vendure.io/reference/vendure-config/
 */
export const config: VendureConfig = {
  apiOptions: {
    port: Number(process.env['VENDURE_PORT'] ?? 3000),
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    adminApiPlayground: process.env['NODE_ENV'] !== 'production',
    shopApiPlayground: process.env['NODE_ENV'] !== 'production',
  },

  authOptions: {
    tokenMethod: 'bearer',
    requireVerification: false,
    superadminCredentials: {
      identifier: process.env['SUPERADMIN_IDENTIFIER'] ?? 'superadmin',
      password: process.env['SUPERADMIN_PASSWORD'] ?? 'superadmin',
    },
  },

  dbConnectionOptions: {
    type: 'postgres',
    synchronize: false,
    migrations: [path.join(__dirname, '../migrations/*.js')],
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? 6432),
    database: process.env['DB_NAME'] ?? 'simket',
    username: process.env['DB_USER'] ?? 'simket',
    password: process.env['DB_PASSWORD'] ?? 'simket_dev',
    extra: {
      // PgBouncer transaction mode: disable prepared statements
      statement_timeout: 30_000,
    },
  },

  jobQueueOptions: {
    activeQueues: ['default'],
  },

  paymentOptions: {
    paymentMethodHandlers: [],
  },

  plugins: [
    CatalogPlugin,
    BundlePlugin,
    DependencyPlugin,
    CollaborationPlugin,
    StorefrontPlugin,
    SearchSyncPlugin,
    NotificationPlugin,
    WishlistPlugin,
    AbTestingPlugin,
    PlatformFeePlugin,
    PurchaseParityPlugin,
    ProductMetadataPlugin,
    GiftPlugin,
    ReportingPlugin,
    CheckoutPlugin,
    PaymentWebhookPlugin,
    EmailNotificationsPlugin,
    StoreRoutingPlugin,
    SettlementPlugin,
  ],
};
