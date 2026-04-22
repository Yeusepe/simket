/**
 * Purpose: Guard Better Auth runtime URL defaults used by the local storefront
 *          and auth bridge.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://www.better-auth.com/docs/reference/options
 * Tests:
 *   - packages/vendure-server/src/auth/config.test.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = {
  STOREFRONT_PUBLIC_URL: process.env['STOREFRONT_PUBLIC_URL'],
  SIMKET_STOREFRONT_URL: process.env['SIMKET_STOREFRONT_URL'],
};

afterEach(() => {
  vi.resetModules();

  if (ORIGINAL_ENV.STOREFRONT_PUBLIC_URL === undefined) {
    delete process.env['STOREFRONT_PUBLIC_URL'];
  } else {
    process.env['STOREFRONT_PUBLIC_URL'] = ORIGINAL_ENV.STOREFRONT_PUBLIC_URL;
  }

  if (ORIGINAL_ENV.SIMKET_STOREFRONT_URL === undefined) {
    delete process.env['SIMKET_STOREFRONT_URL'];
  } else {
    process.env['SIMKET_STOREFRONT_URL'] = ORIGINAL_ENV.SIMKET_STOREFRONT_URL;
  }
});

describe('auth config storefront origin', () => {
  it('defaults to the local storefront dev server origin', async () => {
    delete process.env['STOREFRONT_PUBLIC_URL'];
    delete process.env['SIMKET_STOREFRONT_URL'];

    const { resolveStorefrontOrigin } = await import('./config.js');

    expect(resolveStorefrontOrigin()).toBe('http://localhost:3000');
  });
});
