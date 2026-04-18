/**
 * Purpose: Shared creator license policy and issued-license types for storefront dashboard management flows.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://keygen.sh/docs/api/licenses/
 *   - https://keygen.sh/docs/api/policies/
 * Tests:
 *   - packages/storefront/src/components/dashboard/licenses/use-licenses.test.ts
 *   - packages/storefront/src/components/dashboard/licenses/LicenseListPage.test.tsx
 */
export type LicenseScheme = 'per-seat' | 'per-machine' | 'floating';

export type LicenseStatus = 'active' | 'expired' | 'suspended' | 'revoked';

export interface LicenseProductOption {
  readonly id: string;
  readonly name: string;
}

export interface LicensePolicy {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly scheme: LicenseScheme;
  readonly maxMachines: number;
  readonly maxUses: number;
  readonly durationDays: number | null;
  readonly attachedProductIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LicensePolicyFormData {
  readonly name: string;
  readonly description: string;
  readonly scheme: LicenseScheme;
  readonly maxMachines: number;
  readonly maxUses: number;
  readonly durationDays: number | null;
  readonly attachedProductIds: readonly string[];
}

export interface LicensePolicyFormErrors {
  name?: string;
  maxMachines?: string;
  maxUses?: string;
  durationDays?: string;
  attachedProductIds?: string;
}

export interface MachineActivation {
  readonly id: string;
  readonly name: string;
  readonly fingerprint: string;
  readonly activatedAt: string;
  readonly lastValidatedAt?: string;
}

export interface LicenseValidationEvent {
  readonly id: string;
  readonly status: 'passed' | 'failed';
  readonly detail: string;
  readonly createdAt: string;
}

export interface LicenseRecord {
  readonly id: string;
  readonly key: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly productId: string;
  readonly productName: string;
  readonly policyId: string;
  readonly status: LicenseStatus;
  readonly createdAt: string;
  readonly expiresAt?: string;
  readonly machineActivations: readonly MachineActivation[];
  readonly validationHistory: readonly LicenseValidationEvent[];
}
