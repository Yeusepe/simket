/**
 * Purpose: Export surface for creator license dashboard hooks, types, and UI sections.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://keygen.sh/docs/api/licenses/
 * Tests:
 *   - packages/storefront/src/components/dashboard/licenses/use-licenses.test.ts
 */
export { LicenseDetailModal } from './LicenseDetailModal';
export { LicenseListPage } from './LicenseListPage';
export { LicensePoliciesPage } from './LicensePoliciesPage';
export { LicensePolicyForm } from './LicensePolicyForm';
export * from './license-types';
export * from './use-licenses';
