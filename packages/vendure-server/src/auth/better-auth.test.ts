/** Tests for Better Auth JWT validation using jose. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateKeyPair, SignJWT } from 'jose';
import type { CryptoKey as JoseCryptoKey } from 'jose';

process.env['BETTER_AUTH_URL'] = 'https://auth.test.com';
process.env['BETTER_AUTH_PUBLIC_URL'] = 'https://auth.test.com';

const {
  validateJwtWithKey,
  resetPublicKeyCache,
} = await import('./better-auth.js');

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
    .setIssuedAt()
    .setIssuer('https://auth.test.com')
    .setAudience('https://auth.test.com');

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
        { sub: 'user-123', role: 'creator' },
        privateKey,
        { expiresIn: '1h' },
      );

      const result = await validateJwtWithKey(token, publicKey);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.role).toBe('creator');
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
      expect(result.role).toBeUndefined();
    });
  });
});
