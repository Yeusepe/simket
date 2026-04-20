/**
 * Purpose: Validate Simket Better Auth JWTs against the locally-hosted JWKS so
 *          Vendure can trust Better Auth sessions without duplicating auth state.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://better-auth.com/docs/plugins/jwt
 *   - https://github.com/panva/jose
 * Tests:
 *   - packages/vendure-server/src/auth/better-auth.test.ts
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTPayload, CryptoKey as JoseCryptoKey, KeyObject, JWK, JWTVerifyGetKey } from 'jose';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { BETTER_AUTH_PROVIDER_ID, resolveBetterAuthDatabasePath, resolveBetterAuthJwtAudience, resolveBetterAuthJwtIssuer, resolveBetterAuthServerOrigin } from './config.js';

export interface JwtValidationResult {
  valid: boolean;
  userId?: string;
  email?: string;
  name?: string;
  image?: string | null;
  role?: string;
  authSource?: string;
  creatorSlug?: string | null;
}

interface BetterAuthUserRow {
  readonly id: string;
  readonly role: string | null;
  readonly authSource: string | null;
  readonly creatorSlug: string | null;
  readonly image: string | null;
}

interface BetterAuthAccountRow {
  readonly userId: string;
  readonly providerId: string;
}

interface BetterAuthDatabase {
  readonly user: BetterAuthUserRow;
  readonly account: BetterAuthAccountRow;
}

function getJwksUrl(): string {
  return `${resolveBetterAuthServerOrigin()}/api/auth/jwks`;
}

function toValidationResult(payload: JWTPayload): JwtValidationResult {
  const role = typeof payload['role'] === 'string' ? payload['role'] : undefined;
  const creatorSlug =
    typeof payload['creatorSlug'] === 'string' ? payload['creatorSlug'] : null;

  return {
    valid: true,
    userId:
      typeof payload.sub === 'string'
        ? payload.sub
        : typeof payload['id'] === 'string'
          ? payload['id']
          : undefined,
    email: typeof payload['email'] === 'string' ? payload['email'] : undefined,
    name: typeof payload['name'] === 'string' ? payload['name'] : undefined,
    image: typeof payload['image'] === 'string' ? payload['image'] : null,
    role,
    authSource: typeof payload['authSource'] === 'string' ? payload['authSource'] : undefined,
    creatorSlug,
  };
}

let cachedAuthDatabase: Kysely<BetterAuthDatabase> | null = null;

function getAuthDatabase(): Kysely<BetterAuthDatabase> {
  if (cachedAuthDatabase) {
    return cachedAuthDatabase;
  }

  cachedAuthDatabase = new Kysely<BetterAuthDatabase>({
    dialect: new SqliteDialect({
      database: new Database(resolveBetterAuthDatabasePath()),
    }),
  });

  return cachedAuthDatabase;
}

export interface BetterAuthIdentity {
  readonly role: string;
  readonly authSource: string;
  readonly creatorSlug: string | null;
  readonly image: string | null;
}

export async function lookupBetterAuthIdentity(userId: string): Promise<BetterAuthIdentity | null> {
  const authDatabase = getAuthDatabase();
  const user = await authDatabase
    .selectFrom('user')
    .select(['role', 'authSource', 'creatorSlug', 'image'])
    .where('id', '=', userId)
    .executeTakeFirst();

  const accounts = await authDatabase
    .selectFrom('account')
    .select(['providerId'])
    .where('userId', '=', userId)
    .execute();

  const hasYucpAccount = accounts.some((account) => account.providerId === BETTER_AUTH_PROVIDER_ID);

  if (!user && accounts.length === 0) {
    return null;
  }

  return {
    role:
      typeof user?.role === 'string' && user.role.length > 0
        ? user.role
        : hasYucpAccount
          ? 'creator'
          : 'buyer',
    authSource:
      typeof user?.authSource === 'string' && user.authSource.length > 0
        ? user.authSource
        : hasYucpAccount
          ? 'yucp'
          : 'simket',
    creatorSlug:
      typeof user?.creatorSlug === 'string' && user.creatorSlug.length > 0
        ? user.creatorSlug
        : null,
    image: typeof user?.image === 'string' && user.image.length > 0 ? user.image : null,
  };
}

/**
 * JWKS key set — lazily created from BETTER_AUTH_URL.
 * jose's createRemoteJWKSet handles fetching, caching, and rotation internally.
 */
let cachedJwks: JWTVerifyGetKey | null = null;

function getJwks(): JWTVerifyGetKey {
  if (cachedJwks) return cachedJwks;
  cachedJwks = createRemoteJWKSet(new URL(getJwksUrl()));
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
    const { payload } = await jwtVerify(token, jwks, {
      issuer: resolveBetterAuthJwtIssuer(),
      audience: resolveBetterAuthJwtAudience(),
    });

    return toValidationResult(payload);
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

    const { payload } = await jwtVerify(token, key, {
      issuer: resolveBetterAuthJwtIssuer(),
      audience: resolveBetterAuthJwtAudience(),
    });

    return toValidationResult(payload);
  } catch {
    return deny;
  }
}

/** Reset JWKS cache (e.g., on key rotation or for tests). */
export function resetPublicKeyCache(): void {
  cachedJwks = null;
  keyResolver = null;
}
