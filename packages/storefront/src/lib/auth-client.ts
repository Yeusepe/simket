/**
 * Purpose: Create the shared Better Auth client used by the Simket storefront.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://better-auth.com/docs/plugins/generic-oauth
 *   - https://better-auth.com/docs/plugins/jwt
 * Tests:
 *   - packages/storefront/src/components/settings/use-settings.test.ts
 */
import { createAuthClient } from 'better-auth/react';
import { genericOAuthClient, jwtClient } from 'better-auth/client/plugins';

export function getAuthBaseUrl(): string {
  const configuredUrl = (import.meta as ImportMeta & {
    readonly env?: Record<string, string | undefined>;
  }).env?.VITE_SIMKET_AUTH_URL;

  if (typeof configuredUrl === 'string' && configuredUrl.length > 0) {
    return configuredUrl;
  }

  if (window.location.port === '5173') {
    return 'http://localhost:3200';
  }

  return window.location.origin;
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [genericOAuthClient(), jwtClient()],
});
