/**
 * Purpose: Route-level creator dashboard page for managing license policies and issued keys.
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
import { LicenseListPage, LicensePoliciesPage, type LicensePolicy, type LicenseProductOption, type LicenseRecord, useLicenses } from '../../components/dashboard';

const AVAILABLE_PRODUCTS: readonly LicenseProductOption[] = [
  { id: 'product-brush-pack', name: 'Brush Pack' },
  { id: 'product-shader-pack', name: 'Shader Pack' },
  { id: 'product-enterprise-toolkit', name: 'Enterprise Toolkit' },
];

const INITIAL_POLICIES: readonly LicensePolicy[] = [
  {
    id: 'policy-single-user',
    name: 'Single User',
    description: 'One seat with a small activation buffer for desktop and laptop installs.',
    scheme: 'per-seat',
    maxMachines: 2,
    maxUses: 25,
    durationDays: 365,
    attachedProductIds: ['product-brush-pack'],
    createdAt: '2025-02-01T10:00:00.000Z',
    updatedAt: '2025-02-01T10:00:00.000Z',
  },
  {
    id: 'policy-team',
    name: 'Team',
    description: 'Floating license pool for indie teams sharing a common asset seat count.',
    scheme: 'floating',
    maxMachines: 10,
    maxUses: 100,
    durationDays: 30,
    attachedProductIds: ['product-shader-pack'],
    createdAt: '2025-02-02T10:00:00.000Z',
    updatedAt: '2025-02-02T10:00:00.000Z',
  },
];

const INITIAL_LICENSES: readonly LicenseRecord[] = [
  {
    id: 'license-brush-pack',
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
        id: 'activation-mac',
        name: 'Studio Mac',
        fingerprint: 'mac-studio-01',
        activatedAt: '2025-02-11T08:00:00.000Z',
        lastValidatedAt: '2025-02-15T12:00:00.000Z',
      },
    ],
    validationHistory: [
      {
        id: 'validation-pass-1',
        status: 'passed',
        detail: 'Validated successfully from desktop activation.',
        createdAt: '2025-02-15T12:00:00.000Z',
      },
    ],
  },
  {
    id: 'license-team',
    key: 'WXYZ-1234-5678-QRST',
    customerName: 'Taylor Studio',
    customerEmail: 'taylor@example.com',
    productId: 'product-shader-pack',
    productName: 'Shader Pack',
    policyId: 'policy-team',
    status: 'suspended',
    createdAt: '2025-02-12T12:00:00.000Z',
    expiresAt: '2025-03-12T12:00:00.000Z',
    machineActivations: [],
    validationHistory: [
      {
        id: 'validation-fail-1',
        status: 'failed',
        detail: 'Validation blocked while the license was suspended.',
        createdAt: '2025-02-14T09:30:00.000Z',
      },
    ],
  },
];

export function DashboardLicensesPage() {
  const { policies, licenses, actions } = useLicenses({
    initialPolicies: INITIAL_POLICIES,
    initialLicenses: INITIAL_LICENSES,
  });

  return (
    <div className="space-y-6">
      <LicensePoliciesPage
        policies={policies}
        availableProducts={AVAILABLE_PRODUCTS}
        onCreatePolicy={(data) => actions.createPolicy(data).then(() => undefined)}
        onUpdatePolicy={(policyId, data) => actions.updatePolicy(policyId, data).then(() => undefined)}
        onDeletePolicy={(policyId) => actions.deletePolicy(policyId)}
      />
      <LicenseListPage
        licenses={licenses}
        policies={policies}
        onSuspend={(licenseId) => actions.suspendLicense(licenseId).then(() => undefined)}
        onReinstate={(licenseId) => actions.reinstateLicense(licenseId).then(() => undefined)}
        onRevoke={(licenseId) => actions.revokeLicense(licenseId).then(() => undefined)}
        onExtend={(licenseId, days) => actions.extendLicense(licenseId, days).then(() => undefined)}
      />
    </div>
  );
}
