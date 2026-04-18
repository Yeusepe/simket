/**
 * Purpose: Regression tests for creator license policy and issued-license dashboard state.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://keygen.sh/docs/api/licenses/
 *   - https://keygen.sh/docs/api/policies/
 * Tests:
 *   - packages/storefront/src/components/dashboard/licenses/use-licenses.test.ts
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  maskLicenseKey,
  summarizeDurationDays,
  useLicenses,
  validateLicensePolicyForm,
} from './use-licenses';
import type { LicensePolicy, LicensePolicyFormData, LicenseRecord } from './license-types';

const INITIAL_POLICIES: readonly LicensePolicy[] = [
  {
    id: 'policy-single-user',
    name: 'Single User',
    description: 'One seat perpetual license',
    scheme: 'per-seat',
    maxMachines: 2,
    maxUses: 25,
    durationDays: 365,
    attachedProductIds: ['product-brush-pack'],
    createdAt: '2025-02-01T10:00:00.000Z',
    updatedAt: '2025-02-01T10:00:00.000Z',
  },
];

const INITIAL_LICENSES: readonly LicenseRecord[] = [
  {
    id: 'license-1',
    key: 'ABCD-EFGH-IJKL-MNOP',
    customerName: 'Alex Buyer',
    customerEmail: 'alex@example.com',
    productId: 'product-brush-pack',
    productName: 'Brush Pack',
    policyId: 'policy-single-user',
    status: 'active',
    createdAt: '2025-02-10T12:00:00.000Z',
    expiresAt: '2026-02-10T12:00:00.000Z',
    machineActivations: [
      {
        id: 'machine-1',
        name: 'Studio Mac',
        fingerprint: 'mac-studio',
        activatedAt: '2025-02-11T08:00:00.000Z',
        lastValidatedAt: '2025-02-15T12:00:00.000Z',
      },
    ],
    validationHistory: [
      {
        id: 'validation-1',
        status: 'passed',
        detail: 'License validated successfully',
        createdAt: '2025-02-15T12:00:00.000Z',
      },
    ],
  },
];

const NEW_POLICY: LicensePolicyFormData = {
  name: 'Team',
  description: 'Shared team license',
  scheme: 'floating',
  maxMachines: 10,
  maxUses: 100,
  durationDays: 30,
  attachedProductIds: ['product-brush-pack', 'product-shader-pack'],
};

describe('useLicenses', () => {
  it('creates and updates policies', async () => {
    const { result } = renderHook(() =>
      useLicenses({ initialPolicies: INITIAL_POLICIES, initialLicenses: INITIAL_LICENSES }),
    );

    let createdPolicyId = '';

    await act(async () => {
      const createdPolicy = await result.current.actions.createPolicy(NEW_POLICY);
      createdPolicyId = createdPolicy.id;
    });

    expect(result.current.policies).toHaveLength(2);
    expect(result.current.policies.some((policy) => policy.name === 'Team')).toBe(true);

    await act(async () => {
      await result.current.actions.updatePolicy(createdPolicyId, {
        ...NEW_POLICY,
        maxMachines: 15,
      });
    });

    expect(result.current.policies.find((policy) => policy.id === createdPolicyId)?.maxMachines).toBe(15);
  });

  it('suspends, reinstates, revokes, and extends licenses', async () => {
    const { result } = renderHook(() =>
      useLicenses({ initialPolicies: INITIAL_POLICIES, initialLicenses: INITIAL_LICENSES }),
    );

    await act(async () => {
      await result.current.actions.suspendLicense('license-1');
    });
    expect(result.current.licenses[0]?.status).toBe('suspended');

    await act(async () => {
      await result.current.actions.reinstateLicense('license-1');
    });
    expect(result.current.licenses[0]?.status).toBe('active');

    await act(async () => {
      await result.current.actions.extendLicense('license-1', 30);
    });
    expect(result.current.licenses[0]?.expiresAt).toBe('2026-03-12T12:00:00.000Z');

    await act(async () => {
      await result.current.actions.revokeLicense('license-1');
    });
    expect(result.current.licenses[0]?.status).toBe('revoked');
  });
});

describe('license helpers', () => {
  it('masks keys for list displays', () => {
    expect(maskLicenseKey('ABCD-EFGH-IJKL-MNOP')).toBe('••••-••••-••••-MNOP');
  });

  it('summarizes duration copy for creator-facing policy cards', () => {
    expect(summarizeDurationDays(30)).toBe('30 days');
    expect(summarizeDurationDays(null)).toBe('Never expires');
  });

  it('validates required fields and numeric constraints', () => {
    expect(
      validateLicensePolicyForm({
        name: '',
        scheme: 'per-seat',
        maxMachines: 0,
        maxUses: -1,
        durationDays: -20,
        attachedProductIds: [],
      }),
    ).toEqual(
      expect.objectContaining({
        name: 'Policy name is required.',
        maxMachines: 'Max machines must be at least 1.',
        maxUses: 'Max uses must be 0 or greater.',
        durationDays: 'Duration must be 0 or greater.',
        attachedProductIds: 'Attach the policy to at least one product.',
      }),
    );
  });
});
