/**
 * Purpose: Centralize Better Auth runtime configuration, shared URLs, and
 *          development database paths for the Simket auth bridge.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://www.better-auth.com/docs
 * Tests:
 *   - packages/vendure-server/src/auth/better-auth.test.ts
 */
import path from 'node:path';

export const BETTER_AUTH_PROVIDER_ID = 'yucp-creators';
export const BETTER_AUTH_ROUTE_PREFIX = '/api/auth';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function resolveLocalAuthOrigin(): string {
  return `http://localhost:${Number(process.env['BETTER_AUTH_PORT'] ?? 3200)}`;
}

export function resolveBetterAuthPublicBaseUrl(): string {
  return trimTrailingSlash(
    process.env['BETTER_AUTH_PUBLIC_URL']
      ?? process.env['VITE_SIMKET_AUTH_URL']
      ?? resolveLocalAuthOrigin(),
  );
}

export function resolveBetterAuthServerOrigin(): string {
  return trimTrailingSlash(process.env['BETTER_AUTH_SERVER_URL'] ?? resolveLocalAuthOrigin());
}

export function resolveStorefrontOrigin(): string {
  return trimTrailingSlash(
    process.env['STOREFRONT_PUBLIC_URL']
      ?? process.env['SIMKET_STOREFRONT_URL']
      ?? 'http://localhost:5173',
  );
}

export function resolveBetterAuthDatabasePath(): string {
  return path.resolve(
    process.cwd(),
    process.env['BETTER_AUTH_DB_PATH'] ?? '.data\\better-auth.sqlite',
  );
}

export function resolveBetterAuthJwtAudience(): string {
  return process.env['BETTER_AUTH_JWT_AUDIENCE'] ?? resolveBetterAuthPublicBaseUrl();
}

export function resolveBetterAuthJwtIssuer(): string {
  return process.env['BETTER_AUTH_JWT_ISSUER'] ?? resolveBetterAuthPublicBaseUrl();
}

export function resolveYucpBaseUrl(): string {
  return trimTrailingSlash(process.env['YUCP_BASE_URL'] ?? 'https://api.creators.yucp.club');
}

export function resolveYucpDiscoveryUrl(): string {
  return process.env['YUCP_DISCOVERY_URL']
    ?? `${resolveYucpBaseUrl()}/.well-known/oauth-authorization-server/api/auth`;
}

export function resolveYucpIssuer(): string {
  return process.env['YUCP_ISSUER'] ?? `${resolveYucpBaseUrl()}/api/auth`;
}

export function resolveBetterAuthPort(): number {
  return Number(process.env['BETTER_AUTH_PORT'] ?? 3200);
}
