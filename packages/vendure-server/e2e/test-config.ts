/**
 * Purpose: Shared Vendure test configuration for e2e tests.
 * Uses SqljsInitializer for fast in-memory testing without Docker.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/regular-programming-practices/testing-and-scale.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/testing/
 *   - https://docs.vendure.io/reference/typescript-api/testing/test-config/
 *   - https://docs.vendure.io/reference/typescript-api/testing/sqljs-initializer/
 * Tests:
 *   - Used by all e2e test suites
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from '@vendure/core';
import { testConfig, SqljsInitializer, registerInitializer } from '@vendure/testing';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// SQLite data directory for caching initial-data population between test runs
const sqliteDataDir = path.join(__dirname, '__data__');

registerInitializer('sqljs', new SqljsInitializer(sqliteDataDir));

/**
 * Creates a test VendureConfig merged with the defaults from @vendure/testing.
 * Plugins under test can be added via the `plugins` override.
 */
export function getTestConfig(overrides: Parameters<typeof mergeConfig>[1] = {}) {
  return mergeConfig(testConfig, {
    apiOptions: {
      port: 3111 + Math.floor(Math.random() * 100),
    },
    ...overrides,
  });
}
