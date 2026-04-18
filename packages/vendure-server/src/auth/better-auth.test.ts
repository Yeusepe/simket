/**
 * Tests for better-auth.ts — JWT validation using jose library.
 *
 * Uses jose's own key generation and JWT signing (SignJWT) instead of
 * the deprecated `jsonwebtoken` package. Tests validate against local
 * keys via validateJwtWithKey(), avoiding JWKS server mocking.
 *
 * External reference: https://github.com/panva/jose
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateKeyPair, SignJWT } from 'jose';
import type { CryptoKey as JoseCryptoKey } from 'jose';

vi.mock('../resilience/resilience.js', () => ({
  SERVICE_POLICIES: {
    betterAuth: {
      execute: (fn: () => unknown) => fn(),
    },
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

process.env['BETTER_AUTH_URL'] = 'https://auth.test.com';
process.env['BETTER_AUTH_CLIENT_ID'] = 'test-client-id';
process.env['BETTER_AUTH_CLIENT_SECRET'] = 'test-client-secret';

import {
  validateJwtWithKey,
  issueServiceToken,
  resetPublicKeyCache,
} from './better-auth.js';

// Generate RS256 key pair once for all tests (jose async key generation)
let publicKey: JoseCryptoKey;
let privateKey: JoseCryptoKey;
let otherPrivateKey: JoseCryptoKey;

beforeEach(() => {
  resetPublicKeyCache();
  vi.clearAllMocks();
});

// Generate keys before all tests
async function setupKeys(): Promise<void> {
  const kp = await generateKeyPair('RS256');
  publicKey = kp.publicKey;
  privateKey = kp.privateKey;

  const otherKp = await generateKeyPair('RS256');
  otherPrivateKey = otherKp.privateKey;
}

/** Helper: sign a JWT with jose's SignJWT */
async function signJwt(
  payload: Record<string, unknown>,
  key: JoseCryptoKey,
  options?: { expiresIn?: string; expired?: boolean },
): Promise<string> {
  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt();

  if (options?.expired) {
    // Set expiry 1 hour in the past
    builder.setExpirationTime(new Date(Date.now() - 3_600_000));
  } else if (options?.expiresIn) {
    builder.setExpirationTime(options.expiresIn);
  }

  return builder.sign(key);
}

describe('BetterAuth (jose)', () => {
  // Setup keys before first test
  beforeEach(async () => {
    if (!publicKey) await setupKeys();
  });

  describe('validateJwtWithKey', () => {
    it('should validate a correctly signed JWT', async () => {
      const token = await signJwt(
        { sub: 'user-123', roles: ['buyer', 'seller'] },
        privateKey,
        { expiresIn: '1h' },
      );

      const result = await validateJwtWithKey(token, publicKey);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.roles).toEqual(['buyer', 'seller']);
    });

    it('should deny a token signed with a different key', async () => {
      const token = await signJwt(
        { sub: 'user-123' },
        otherPrivateKey,
        { expiresIn: '1h' },
      );

      const result = await validateJwtWithKey(token, publicKey);

      expect(result.valid).toBe(false);
      expect(result.userId).toBeUndefined();
    });

    it('should deny a malformed token (not three parts)', async () => {
      const result = await validateJwtWithKey('only-two.parts', publicKey);
      expect(result.valid).toBe(false);
    });

    it('should deny an empty token', async () => {
      const result = await validateJwtWithKey('', publicKey);
      expect(result.valid).toBe(false);
    });

    it('should deny a token with invalid content', async () => {
      const result = await validateJwtWithKey('abc.def.ghi', publicKey);
      expect(result.valid).toBe(false);
    });

    it('should deny an expired token', async () => {
      const token = await signJwt(
        { sub: 'user-123' },
        privateKey,
        { expired: true },
      );

      const result = await validateJwtWithKey(token, publicKey);

      expect(result.valid).toBe(false);
    });

    it('should accept a token without roles claim', async () => {
      const token = await signJwt(
        { sub: 'user-456' },
        privateKey,
        { expiresIn: '1h' },
      );

      const result = await validateJwtWithKey(token, publicKey);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-456');
      expect(result.roles).toBeUndefined();
    });
  });

  describe('issueServiceToken', () => {
    it('should request a token using client credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'svc-token-xyz' }),
      });

      const token = await issueServiceToken();

      expect(token).toBe('svc-token-xyz');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.test.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: 'test-client-id',
            client_secret: 'test-client-secret',
          }),
        }),
      );
    });

    it('should throw on HTTP error from token endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      await expect(issueServiceToken()).rejects.toThrow(
        'Service token request failed',
      );
    });

    it('should throw when access_token is missing in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(issueServiceToken()).rejects.toThrow(
        'No access_token in response',
      );
    });
  });
});
