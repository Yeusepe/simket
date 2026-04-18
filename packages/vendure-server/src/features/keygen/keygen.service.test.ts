/**
 * Purpose: Unit tests for the Keygen licensing service and its pure helpers.
 * Governing docs:
 *   - docs/architecture.md (§4 System boundary, §5 Service ownership)
 *   - docs/service-architecture.md (§1.11 Keygen)
 *   - docs/domain-model.md (§1 Core records, License)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://keygen.sh/docs/api/licenses/
 *   - https://keygen.sh/docs/api/errors/
 *   - https://keygen.sh/docs/api/pagination/
 *   - https://keygen.sh/docs/api/webhooks/
 * Tests:
 *   - packages/vendure-server/src/features/keygen/keygen.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type {
  CreateLicenseInput,
  KeygenConfig,
  License,
  ValidationResult,
} from './keygen.types.js';
import {
  KeygenConfigError,
  KeygenService,
  KeygenServiceError,
  formatLicenseKey,
  isLicenseExpired,
  isValidLicenseStatus,
  isValidLicenseType,
  parseLicenseKey,
  validateKeygenConfig,
} from './keygen.service.js';

const VALID_CONFIG: KeygenConfig = {
  accountId: 'acct_123',
  productToken: 'prod_token_123',
  apiUrl: 'https://api.keygen.sh',
};

const VALID_CREATE_INPUT: CreateLicenseInput = {
  policyId: 'policy_123',
  userId: 'user_123',
  productId: 'product_123',
  licenseType: 'subscription',
  metadata: {
    orderId: 'order_123',
  },
};

interface MockResponseInit {
  readonly status?: number;
  readonly json?: Record<string, unknown>;
}

function createMockResponse(init: MockResponseInit = {}) {
  return {
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    json: vi.fn(async () => init.json ?? {}),
    text: vi.fn(async () => JSON.stringify(init.json ?? {})),
  } as const;
}

function createLicenseResponse(overrides?: {
  id?: string;
  key?: string;
  status?: string;
  expiry?: string | null;
  suspended?: boolean;
  policyId?: string;
  userId?: string;
  productId?: string;
  metadata?: Record<string, unknown>;
}) {
  return {
    data: {
      id: overrides?.id ?? 'lic_123',
      type: 'licenses',
      attributes: {
        key: overrides?.key ?? 'ABCD1234EFGH5678',
        status: overrides?.status ?? 'ACTIVE',
        expiry: overrides?.expiry ?? '2030-01-01T00:00:00.000Z',
        suspended: overrides?.suspended ?? false,
        metadata: {
          licenseType: 'subscription',
          vendureProductId: overrides?.productId ?? 'product_123',
          ...(overrides?.metadata ?? {}),
        },
        created: '2025-01-01T00:00:00.000Z',
      },
      relationships: {
        policy: {
          data: {
            type: 'policies',
            id: overrides?.policyId ?? 'policy_123',
          },
        },
        owner: {
          data: {
            type: 'users',
            id: overrides?.userId ?? 'user_123',
          },
        },
        product: {
          data: {
            type: 'products',
            id: overrides?.productId ?? 'product_123',
          },
        },
      },
    },
  };
}

function createService(responses: ReadonlyArray<ReturnType<typeof createMockResponse>>) {
  const fetchImpl = vi.fn();
  for (const response of responses) {
    fetchImpl.mockResolvedValueOnce(response);
  }

  const service = new KeygenService(VALID_CONFIG, {
    fetch: fetchImpl as typeof fetch,
    policy: {
      execute: async <T>(fn: () => Promise<T>) => fn(),
    },
  });

  return {
    fetchImpl,
    service,
  };
}

describe('isValidLicenseType', () => {
  it('accepts supported license types', () => {
    expect(isValidLicenseType('perpetual')).toBe(true);
    expect(isValidLicenseType('subscription')).toBe(true);
    expect(isValidLicenseType('trial')).toBe(true);
  });

  it('rejects unsupported license types', () => {
    expect(isValidLicenseType('annual')).toBe(false);
    expect(isValidLicenseType('')).toBe(false);
  });
});

describe('isValidLicenseStatus', () => {
  it('accepts supported license statuses', () => {
    expect(isValidLicenseStatus('active')).toBe(true);
    expect(isValidLicenseStatus('suspended')).toBe(true);
    expect(isValidLicenseStatus('expired')).toBe(true);
    expect(isValidLicenseStatus('revoked')).toBe(true);
  });

  it('rejects unsupported license statuses', () => {
    expect(isValidLicenseStatus('inactive')).toBe(false);
    expect(isValidLicenseStatus('banned')).toBe(false);
  });
});

describe('isLicenseExpired', () => {
  it('returns true when a license expiry is in the past', () => {
    const license: License = {
      id: 'lic_1',
      key: 'ABCD1234',
      policyId: 'policy_1',
      userId: 'user_1',
      productId: 'product_1',
      status: 'expired',
      licenseType: 'trial',
      expiresAt: '2020-01-01T00:00:00.000Z',
      createdAt: '2019-01-01T00:00:00.000Z',
      metadata: {},
    };

    expect(isLicenseExpired(license)).toBe(true);
  });

  it('returns false when a license expiry is in the future', () => {
    const license: License = {
      id: 'lic_1',
      key: 'ABCD1234',
      policyId: 'policy_1',
      userId: 'user_1',
      productId: 'product_1',
      status: 'active',
      licenseType: 'subscription',
      expiresAt: '2999-01-01T00:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
      metadata: {},
    };

    expect(isLicenseExpired(license)).toBe(false);
  });

  it('returns false when a license has no expiry', () => {
    const license: License = {
      id: 'lic_1',
      key: 'ABCD1234',
      policyId: 'policy_1',
      userId: 'user_1',
      productId: 'product_1',
      status: 'active',
      licenseType: 'perpetual',
      createdAt: '2025-01-01T00:00:00.000Z',
      metadata: {},
    };

    expect(isLicenseExpired(license)).toBe(false);
  });
});

describe('formatLicenseKey', () => {
  it('formats long keys into 4-character groups', () => {
    expect(formatLicenseKey('abcd1234efgh5678')).toBe('ABCD-1234-EFGH-5678');
  });
});

describe('parseLicenseKey', () => {
  it('removes separators and normalizes casing', () => {
    expect(parseLicenseKey('ABCD-1234-efgh-5678')).toBe('ABCD1234EFGH5678');
  });
});

describe('validateKeygenConfig', () => {
  it('accepts a complete Keygen config', () => {
    expect(validateKeygenConfig(VALID_CONFIG)).toEqual(VALID_CONFIG);
  });

  it('rejects missing account ids', () => {
    expect(() =>
      validateKeygenConfig({
        ...VALID_CONFIG,
        accountId: '',
      }),
    ).toThrow(KeygenConfigError);
  });
});

describe('KeygenService', () => {
  it('createLicense validates required fields', async () => {
    const { service, fetchImpl } = createService([]);

    await expect(
      service.createLicense({
        ...VALID_CREATE_INPUT,
        policyId: '',
      }),
    ).rejects.toThrow(/policyId/i);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('createLicense creates a license and normalizes the response', async () => {
    const { service, fetchImpl } = createService([
      createMockResponse({
        json: createLicenseResponse(),
      }),
    ]);

    const result = await service.createLicense(VALID_CREATE_INPUT);

    expect(result).toEqual({
      id: 'lic_123',
      key: 'ABCD1234EFGH5678',
      policyId: 'policy_123',
      userId: 'user_123',
      productId: 'product_123',
      status: 'active',
      licenseType: 'subscription',
      expiresAt: '2030-01-01T00:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
      metadata: {
        licenseType: 'subscription',
        vendureProductId: 'product_123',
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.keygen.sh/v1/accounts/acct_123/licenses',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('validateLicense handles a valid validation response', async () => {
    const { service } = createService([
      createMockResponse({
        json: {
          meta: {
            valid: true,
            detail: 'is valid',
            code: 'VALID',
          },
          data: {
            id: 'lic_123',
          },
        },
      }),
    ]);

    const result = await service.validateLicense('ABCD-1234-EFGH-5678');

    expect(result).toEqual<ValidationResult>({
      valid: true,
      detail: 'is valid',
      code: 'VALID',
      licenseId: 'lic_123',
    });
  });

  it('validateLicense handles invalid and expired validation responses', async () => {
    const { service } = createService([
      createMockResponse({
        json: {
          meta: {
            valid: false,
            detail: 'is expired',
            code: 'EXPIRED',
          },
          data: {
            id: 'lic_expired',
          },
        },
      }),
    ]);

    const result = await service.validateLicense('ABCD-1234-EFGH-5678');

    expect(result).toEqual<ValidationResult>({
      valid: false,
      detail: 'is expired',
      code: 'EXPIRED',
      licenseId: 'lic_expired',
    });
  });

  it('throws typed errors for Keygen API failures', async () => {
    const { service } = createService([
      createMockResponse({
        status: 422,
        json: {
          errors: [
            {
              title: 'Unprocessable entity',
              detail: 'must be a valid policy',
              code: 'POLICY_INVALID',
            },
          ],
        },
      }),
    ]);

    await expect(service.createLicense(VALID_CREATE_INPUT)).rejects.toBeInstanceOf(
      KeygenServiceError,
    );
  });
});
