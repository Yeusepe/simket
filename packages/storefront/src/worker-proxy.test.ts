/**
 * Purpose: Verify the storefront worker validates required proxy bindings and
 *          keeps local auth proxy defaults wired for development.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://developers.cloudflare.com/workers/wrangler/configuration/
 *   - https://developers.cloudflare.com/workers/vite-plugin/
 * Tests:
 *   - packages/storefront/src/worker-proxy.test.ts
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import worker from '../worker/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('storefront worker proxy configuration', () => {
  it('fails explicitly when BETTER_AUTH_URL is missing for auth proxy requests', async () => {
    const response = await worker.fetch(
      new Request('http://localhost:3000/api/auth/get-session'),
      {
        VENDURE_API_URL: 'http://localhost:3100',
        BETTER_AUTH_URL: '',
        ENVIRONMENT: 'development',
      },
    );

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toContain('BETTER_AUTH_URL');
  });

  it('defines a Better Auth proxy URL in the local worker config', () => {
    const wranglerConfig = readFileSync(
      path.resolve(__dirname, '../wrangler.jsonc'),
      'utf8',
    );

    expect(wranglerConfig).toContain('"BETTER_AUTH_URL": "http://localhost:3200"');
  });
});
