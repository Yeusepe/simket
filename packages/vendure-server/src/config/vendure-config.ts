import { VendureConfig } from '@vendure/core';
import path from 'node:path';

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

  plugins: [],
};
