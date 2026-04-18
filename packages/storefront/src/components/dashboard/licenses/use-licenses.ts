/**
 * Purpose: Creator dashboard state hook for license policy CRUD and issued-license lifecycle actions.
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
import { useCallback, useMemo, useState } from 'react';
import type {
  LicensePolicy,
  LicensePolicyFormData,
  LicensePolicyFormErrors,
  LicenseRecord,
} from './license-types';

export interface UseLicensesOptions {
  readonly initialPolicies?: readonly LicensePolicy[];
  readonly initialLicenses?: readonly LicenseRecord[];
}

export interface UseLicensesActions {
  createPolicy(data: LicensePolicyFormData): Promise<LicensePolicy>;
  updatePolicy(id: string, data: LicensePolicyFormData): Promise<LicensePolicy>;
  deletePolicy(id: string): Promise<void>;
  suspendLicense(id: string): Promise<LicenseRecord>;
  reinstateLicense(id: string): Promise<LicenseRecord>;
  revokeLicense(id: string): Promise<LicenseRecord>;
  extendLicense(id: string, days: number): Promise<LicenseRecord>;
}

export interface UseLicensesResult {
  readonly policies: readonly LicensePolicy[];
  readonly licenses: readonly LicenseRecord[];
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly actions: UseLicensesActions;
}

export function maskLicenseKey(key: string): string {
  const parts = key.split('-');
  if (parts.length === 0) {
    return key;
  }

  return parts
    .map((part, index) => (index === parts.length - 1 ? part : '•'.repeat(part.length)))
    .join('-');
}

export function summarizeDurationDays(durationDays: number | null): string {
  if (durationDays === null) {
    return 'Never expires';
  }

  return durationDays === 1 ? '1 day' : `${durationDays} days`;
}

export function validateLicensePolicyForm(
  data: Partial<LicensePolicyFormData>,
): LicensePolicyFormErrors {
  const errors: LicensePolicyFormErrors = {};

  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Policy name is required.';
  }

  if (typeof data.maxMachines !== 'number' || Number.isNaN(data.maxMachines) || data.maxMachines < 1) {
    errors.maxMachines = 'Max machines must be at least 1.';
  }

  if (typeof data.maxUses !== 'number' || Number.isNaN(data.maxUses) || data.maxUses < 0) {
    errors.maxUses = 'Max uses must be 0 or greater.';
  }

  if (
    data.durationDays !== null &&
    data.durationDays !== undefined &&
    (Number.isNaN(data.durationDays) || data.durationDays < 0)
  ) {
    errors.durationDays = 'Duration must be 0 or greater.';
  }

  if (!data.attachedProductIds || data.attachedProductIds.length === 0) {
    errors.attachedProductIds = 'Attach the policy to at least one product.';
  }

  return errors;
}

function buildPolicy(data: LicensePolicyFormData, existing?: LicensePolicy): LicensePolicy {
  const timestamp = new Date().toISOString();

  return {
    id: existing?.id ?? `policy-${globalThis.crypto.randomUUID()}`,
    name: data.name,
    description: data.description,
    scheme: data.scheme,
    maxMachines: data.maxMachines,
    maxUses: data.maxUses,
    durationDays: data.durationDays,
    attachedProductIds: [...data.attachedProductIds],
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

function replaceLicense(
  licenses: readonly LicenseRecord[],
  id: string,
  updater: (license: LicenseRecord) => LicenseRecord,
): LicenseRecord[] {
  return licenses.map((license) => (license.id === id ? updater(license) : license));
}

export function useLicenses(options: UseLicensesOptions = {}): UseLicensesResult {
  const [policies, setPolicies] = useState<readonly LicensePolicy[]>(() => options.initialPolicies ?? []);
  const [licenses, setLicenses] = useState<readonly LicenseRecord[]>(() => options.initialLicenses ?? []);
  const [error] = useState<Error | null>(null);

  const createPolicy = useCallback(async (data: LicensePolicyFormData) => {
    const nextPolicy = buildPolicy(data);
    setPolicies((current) => [nextPolicy, ...current]);
    return nextPolicy;
  }, []);

  const updatePolicy = useCallback(async (id: string, data: LicensePolicyFormData) => {
    const currentPolicy = policies.find((policy) => policy.id === id);
    if (!currentPolicy) {
      throw new Error(`Policy ${id} was not found.`);
    }

    const nextPolicy = buildPolicy(data, currentPolicy);
    setPolicies((current) => current.map((policy) => (policy.id === id ? nextPolicy : policy)));
    return nextPolicy;
  }, [policies]);

  const deletePolicy = useCallback(async (id: string) => {
    setPolicies((current) => current.filter((policy) => policy.id !== id));
  }, []);

  const suspendLicense = useCallback(async (id: string) => {
    const existingLicense = licenses.find((license) => license.id === id);
    if (!existingLicense) {
      throw new Error(`License ${id} was not found.`);
    }

    const nextLicense = {
      ...existingLicense,
      status: 'suspended' as const,
    };
    setLicenses((current) => replaceLicense(current, id, () => nextLicense));
    return nextLicense;
  }, [licenses]);

  const reinstateLicense = useCallback(async (id: string) => {
    const existingLicense = licenses.find((license) => license.id === id);
    if (!existingLicense) {
      throw new Error(`License ${id} was not found.`);
    }

    const nextLicense = {
      ...existingLicense,
      status: 'active' as const,
    };
    setLicenses((current) => replaceLicense(current, id, () => nextLicense));
    return nextLicense;
  }, [licenses]);

  const revokeLicense = useCallback(async (id: string) => {
    const existingLicense = licenses.find((license) => license.id === id);
    if (!existingLicense) {
      throw new Error(`License ${id} was not found.`);
    }

    const nextLicense = {
      ...existingLicense,
      status: 'revoked' as const,
    };
    setLicenses((current) => replaceLicense(current, id, () => nextLicense));
    return nextLicense;
  }, [licenses]);

  const extendLicense = useCallback(async (id: string, days: number) => {
    const existingLicense = licenses.find((license) => license.id === id);
    if (!existingLicense) {
      throw new Error(`License ${id} was not found.`);
    }

    if (!Number.isSafeInteger(days) || days <= 0) {
      throw new Error('License extension days must be a positive integer.');
    }

    const baseline = existingLicense.expiresAt
      ? Date.parse(existingLicense.expiresAt)
      : Date.parse(existingLicense.createdAt);
    const expiresAt = new Date(baseline + days * 24 * 60 * 60 * 1_000).toISOString();
    const nextLicense = {
      ...existingLicense,
      expiresAt,
      status: 'active' as const,
    };
    setLicenses((current) => replaceLicense(current, id, () => nextLicense));
    return nextLicense;
  }, [licenses]);

  const sortedPolicies = useMemo(
    () => [...policies].sort((left, right) => left.name.localeCompare(right.name)),
    [policies],
  );
  const sortedLicenses = useMemo(
    () => [...licenses].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    [licenses],
  );

  return {
    policies: sortedPolicies,
    licenses: sortedLicenses,
    isLoading: false,
    error,
    actions: {
      createPolicy,
      updatePolicy,
      deletePolicy,
      suspendLicense,
      reinstateLicense,
      revokeLicense,
      extendLicense,
    },
  };
}
