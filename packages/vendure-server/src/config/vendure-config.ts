import { VendureConfig } from '@vendure/core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FeatureFlagsPlugin } from '../feature-flags/feature-flags.plugin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
import { CrowdSecPlugin } from '../security/crowdsec.plugin.js';

const isDev = process.env['NODE_ENV'] !== 'production';

/**
 * Core Vendure configuration.
 *
 * In dev mode the DB connects directly to PostgreSQL (port 5432).
 * In production it connects through PgBouncer (port 6432) in transaction pooling mode.
 * Job queue uses BullMQ backed by the Redis queue cluster (port 6380).
 *
 * Worker strategy: Vendure runs job workers in the same process in dev,
 * but in production you should run a separate worker process.
 *
 * @see https://docs.vendure.io/reference/vendure-config/
 * @see https://docs.vendure.io/guides/developer-guide/worker-job-queue/
 */
export const config: VendureConfig = {
  apiOptions: {
    port: Number(process.env['VENDURE_PORT'] ?? 3100),
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    adminApiPlayground: isDev,
    shopApiPlayground: isDev,
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
    // In dev: synchronize auto-creates tables from entities.
    // In production: use migrations only (synchronize: false).
    synchronize: isDev,
    migrations: [path.join(__dirname, '../migrations/*.js')],
    // Dev connects directly to PostgreSQL (5432); prod goes through PgBouncer (6432).
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? (isDev ? 5432 : 6432)),
    database: process.env['DB_NAME'] ?? 'simket',
    username: process.env['DB_USER'] ?? 'simket',
    password: process.env['DB_PASSWORD'] ?? 'simket_dev',
    extra: {
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
    CrowdSecPlugin,
    FeatureFlagsPlugin,
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
