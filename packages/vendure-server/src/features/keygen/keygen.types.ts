/**
 * Purpose: Keygen licensing contracts for Simket digital-product licenses.
 * Governing docs:
 *   - docs/architecture.md (§4 System boundary, §5 Service ownership)
 *   - docs/service-architecture.md (§1.11 Keygen)
 *   - docs/domain-model.md (§1 Core records, License)
 * External references:
 *   - https://keygen.sh/docs/api/licenses/
 *   - https://keygen.sh/docs/api/policies/
 *   - https://keygen.sh/docs/choosing-a-licensing-model/perpetual-licenses/
 *   - https://keygen.sh/docs/choosing-a-licensing-model/timed-licenses/
 * Tests:
 *   - packages/vendure-server/src/features/keygen/keygen.service.test.ts
 */

export interface KeygenConfig {
  readonly accountId: string;
  readonly productToken: string;
  readonly apiUrl: string;
}

export type LicenseType = 'perpetual' | 'subscription' | 'trial';
export type LicenseStatus = 'active' | 'suspended' | 'expired' | 'revoked';

export interface CreateLicenseInput {
  readonly policyId: string;
  readonly userId: string;
  readonly productId: string;
  readonly licenseType: LicenseType;
  readonly metadata?: Record<string, string>;
}

export interface License {
  readonly id: string;
  readonly key: string;
  readonly policyId: string;
  readonly userId: string;
  readonly productId: string;
  readonly status: LicenseStatus;
  readonly licenseType: LicenseType;
  readonly expiresAt?: string;
  readonly createdAt: string;
  readonly metadata: Record<string, string>;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly detail: string;
  readonly code: string;
  readonly licenseId?: string;
}
