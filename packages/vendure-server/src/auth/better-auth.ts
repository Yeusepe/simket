/**
 * Better Auth integration — validates JWTs from the Better Auth OAuth provider.
 *
 * Uses `jose` library for standards-compliant JWT/JWKS validation instead
 * of hand-rolling crypto. jose handles JWKS fetching, key caching, key rotation,
 * algorithm verification, and expiry validation automatically.
 *
 * Governing docs:
 *   - docs/architecture.md §5 (Identity & Auth)
 * External references:
 *   - https://github.com/panva/jose (jose library)
 *   - https://www.better-auth.com/docs (Better Auth)
 * Tests:
 *   - packages/vendure-server/src/auth/better-auth.test.ts
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTPayload, CryptoKey as JoseCryptoKey, KeyObject, JWK, JWTVerifyGetKey } from 'jose';
import { SERVICE_POLICIES } from '../resilience/resilience.js';

export interface JwtValidationResult {
  valid: boolean;
  userId?: string;
  roles?: string[];
}

interface BetterAuthConfig {
  url: string;
  clientId: string;
  clientSecret: string;
}

function getConfig(): BetterAuthConfig {
  return {
    url: process.env['BETTER_AUTH_URL'] ?? '',
    clientId: process.env['BETTER_AUTH_CLIENT_ID'] ?? '',
    clientSecret: process.env['BETTER_AUTH_CLIENT_SECRET'] ?? '',
  };
}

/**
 * JWKS key set — lazily created from BETTER_AUTH_URL.
 * jose's createRemoteJWKSet handles fetching, caching, and rotation internally.
 */
let cachedJwks: JWTVerifyGetKey | null = null;

function getJwks(): JWTVerifyGetKey {
  if (cachedJwks) return cachedJwks;

  const { url } = getConfig();
  if (!url) {
    throw new Error('BETTER_AUTH_URL not configured');
  }

  cachedJwks = createRemoteJWKSet(new URL(`${url}/.well-known/jwks.json`));
  return cachedJwks;
}

/**
 * Overridable key resolver for testing.
 * In production, uses JWKS. In tests, set to a static key.
 */
let keyResolver: ((token: string) => Promise<JwtValidationResult>) | null = null;

/**
 * Set a custom validation function (for testing with local keys).
 * Pass `null` to restore default JWKS-based validation.
 */
export function setValidationOverride(
  override: ((token: string) => Promise<JwtValidationResult>) | null,
): void {
  keyResolver = override;
}

/**
 * Validate a JWT token against the Better Auth JWKS public keys.
 *
 * jose handles: JWKS fetching, key caching with automatic rotation,
 * algorithm verification, expiry validation, signature verification.
 *
 * Fail-closed: any validation error results in denial.
 */
export async function validateJwt(
  token: string,
): Promise<JwtValidationResult> {
  // Allow test override
  if (keyResolver) return keyResolver(token);

  const deny: JwtValidationResult = { valid: false };

  try {
    if (!token || token.split('.').length !== 3) {
      return deny;
    }

    const jwks = getJwks();
    const { payload } = await jwtVerify(token, jwks);

    return {
      valid: true,
      userId: payload.sub,
      roles: (payload as JWTPayload & { roles?: string[] }).roles,
    };
  } catch {
    return deny;
  }
}

/** Key type accepted by jose jwtVerify */
type JoseKey = JoseCryptoKey | KeyObject | JWK | Uint8Array;

/**
 * Validate a JWT using a local key (for testing or symmetric secrets).
 */
export async function validateJwtWithKey(
  token: string,
  key: JoseKey,
): Promise<JwtValidationResult> {
  const deny: JwtValidationResult = { valid: false };

  try {
    if (!token || token.split('.').length !== 3) {
      return deny;
    }

    const { payload } = await jwtVerify(token, key);

    return {
      valid: true,
      userId: payload.sub,
      roles: (payload as JWTPayload & { roles?: string[] }).roles,
    };
  } catch {
    return deny;
  }
}

/**
 * Issue a service-to-service token using client credentials.
 * Wrapped with Cockatiel resilience policy.
 */
export async function issueServiceToken(): Promise<string> {
  const config = getConfig();
  if (!config.url || !config.clientId || !config.clientSecret) {
    throw new Error('Better Auth configuration incomplete');
  }

  return SERVICE_POLICIES.betterAuth.execute(async () => {
    const response = await fetch(`${config.url}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Service token request failed: ${response.status}`);
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error('No access_token in response');
    }

    return data.access_token;
  });
}

/** Reset JWKS cache (e.g., on key rotation or for tests). */
export function resetPublicKeyCache(): void {
  cachedJwks = null;
  keyResolver = null;
}
