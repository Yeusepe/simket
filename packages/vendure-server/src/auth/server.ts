/**
 * Purpose: Create the Simket Better Auth authority with local email/password
 *          flows, YUCP creator federation, JWT issuance, and dev-user seeding.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://better-auth.com/docs/plugins/generic-oauth
 *   - https://better-auth.com/docs/plugins/jwt
 *   - https://better-auth.com/docs/integrations/express
 * Tests:
 *   - packages/vendure-server/src/auth/better-auth.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { betterAuth, type Auth, type BetterAuthOptions } from 'better-auth';
import { genericOAuth, jwt } from 'better-auth/plugins';
import { Kysely, SqliteDialect, type UpdateObject } from 'kysely';
import { BETTER_AUTH_PROVIDER_ID, resolveBetterAuthDatabasePath, resolveBetterAuthJwtAudience, resolveBetterAuthJwtIssuer, resolveBetterAuthPublicBaseUrl, resolveStorefrontOrigin, resolveYucpDiscoveryUrl, resolveYucpIssuer } from './config.js';
import { DEVELOPMENT_USER_SEEDS, type DevelopmentUserSeed } from './development-seeds.js';

type BetterAuthUserRow = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly image: string | null;
  readonly role: string | null;
  readonly authSource: string | null;
  readonly bio: string | null;
  readonly website: string | null;
  readonly creatorSlug: string | null;
};

type BetterAuthDatabase = {
  user: BetterAuthUserRow;
};

function ensureParentDirectoryExists(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function createBetterAuthDatabaseDriver() {
  const databasePath = resolveBetterAuthDatabasePath();
  ensureParentDirectoryExists(databasePath);
  return new Database(databasePath);
}

const betterAuthDatabaseDriver = createBetterAuthDatabaseDriver();

export const authDatabase = new Kysely<BetterAuthDatabase>({
  dialect: new SqliteDialect({
    database: betterAuthDatabaseDriver,
  }),
});

const authOptions: BetterAuthOptions = {
  baseURL: resolveBetterAuthPublicBaseUrl(),
  trustedOrigins: [resolveStorefrontOrigin(), resolveBetterAuthPublicBaseUrl()],
  database: betterAuthDatabaseDriver,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'buyer',
        input: false,
      },
      authSource: {
        type: 'string',
        required: false,
        defaultValue: 'simket',
        input: false,
      },
      bio: {
        type: 'string',
        required: false,
      },
      website: {
        type: 'string',
        required: false,
      },
      creatorSlug: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: BETTER_AUTH_PROVIDER_ID,
          clientId: process.env['YUCP_CLIENT_ID'] ?? '',
          clientSecret: process.env['YUCP_CLIENT_SECRET'] ?? '',
          discoveryUrl: resolveYucpDiscoveryUrl(),
          issuer: resolveYucpIssuer(),
          requireIssuerValidation: true,
          scopes: ['openid', 'email', 'profile'],
          disableImplicitSignUp: false,
          authentication: 'post',
          mapProfileToUser: async (profile) => ({
            name:
              typeof profile['name'] === 'string'
                ? profile['name']
                : typeof profile['preferred_username'] === 'string'
                  ? profile['preferred_username']
                  : typeof profile['username'] === 'string'
                    ? profile['username']
                    : undefined,
            image: typeof profile['picture'] === 'string' ? profile['picture'] : undefined,
          }),
        },
      ],
    }),
    jwt({
      jwt: {
        issuer: resolveBetterAuthJwtIssuer(),
        audience: resolveBetterAuthJwtAudience(),
        definePayload: ({ user }) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role:
            typeof user['role'] === 'string' && user['role'].length > 0
              ? user['role']
              : 'buyer',
          authSource:
            typeof user['authSource'] === 'string' && user['authSource'].length > 0
              ? user['authSource']
              : 'simket',
          creatorSlug:
            typeof user['creatorSlug'] === 'string' && user['creatorSlug'].length > 0
              ? user['creatorSlug']
              : null,
        }),
      },
    }),
  ],
};

export const auth: Auth = betterAuth(authOptions);

async function applySeedProfile(seed: DevelopmentUserSeed): Promise<void> {
  const values: UpdateObject<BetterAuthDatabase, 'user', 'user'> = {
    role: seed.role,
    authSource: seed.authSource,
    bio: seed.bio ?? null,
    website: seed.website ?? null,
    image: seed.image ?? null,
    creatorSlug: seed.creatorSlug ?? null,
  };

  await authDatabase
    .updateTable('user')
    .set(values)
    .where('email', '=', seed.email)
    .execute();
}

export async function seedBetterAuthDevelopmentUsers(): Promise<void> {
  for (const seed of DEVELOPMENT_USER_SEEDS) {
    const existingUser = await authDatabase
      .selectFrom('user')
      .select(['id'])
      .where('email', '=', seed.email)
      .executeTakeFirst();

    if (!existingUser) {
      const result = await auth.api.signUpEmail({
        body: {
          email: seed.email,
          name: seed.name,
          password: seed.password,
        },
      });

      if (!result?.user?.id) {
        throw new Error(`Better Auth seed user "${seed.email}" could not be created.`);
      }
    }

    await applySeedProfile(seed);
  }
}
