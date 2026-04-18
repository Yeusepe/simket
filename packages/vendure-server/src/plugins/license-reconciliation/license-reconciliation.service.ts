/**
 * Purpose: License reconciliation — drift detection between Vendure orders
 * and Keygen licenses. Runs daily to detect missing or orphan licenses.
 *
 * Governing docs:
 *   - docs/architecture.md §11 (Licensing — Keygen)
 * External references:
 *   - https://keygen.sh/docs/api/licenses/
 * Tests:
 *   - packages/vendure-server/src/plugins/license-reconciliation/license-reconciliation.service.test.ts
 */

export enum DriftType {
  MISSING_LICENSE = 'MISSING_LICENSE',
  ORPHAN_LICENSE = 'ORPHAN_LICENSE',
}

export interface OrderRecord {
  readonly orderId: string;
  readonly productId: string;
  readonly customerId: string;
  readonly completedAt: string;
}

export interface LicenseRecord {
  readonly licenseId: string;
  readonly orderId: string;
  readonly productId: string;
  readonly status: string;
}

export interface DriftEntry {
  readonly type: DriftType;
  readonly orderId?: string;
  readonly licenseId?: string;
  readonly productId?: string;
}

export type DriftAction = 'CREATE_LICENSE' | 'FLAG_FOR_REVIEW';

/**
 * Compare completed orders against active licenses to detect drift.
 *
 * Missing: order exists, no license.
 * Orphan: license exists, no matching order.
 */
export function detectLicenseDrift(
  orders: readonly OrderRecord[],
  licenses: readonly LicenseRecord[],
): DriftEntry[] {
  const drift: DriftEntry[] = [];

  const licenseByOrderId = new Map<string, LicenseRecord>();
  for (const lic of licenses) {
    licenseByOrderId.set(lic.orderId, lic);
  }

  const orderIds = new Set(orders.map((o) => o.orderId));

  // Detect missing licenses
  for (const order of orders) {
    if (!licenseByOrderId.has(order.orderId)) {
      drift.push({
        type: DriftType.MISSING_LICENSE,
        orderId: order.orderId,
        productId: order.productId,
      });
    }
  }

  // Detect orphan licenses
  for (const lic of licenses) {
    if (!orderIds.has(lic.orderId)) {
      drift.push({
        type: DriftType.ORPHAN_LICENSE,
        licenseId: lic.licenseId,
        orderId: lic.orderId,
        productId: lic.productId,
      });
    }
  }

  return drift;
}

/**
 * Determine the remediation action for a drift type.
 */
export function classifyDriftAction(driftType: DriftType): DriftAction {
  switch (driftType) {
    case DriftType.MISSING_LICENSE:
      return 'CREATE_LICENSE';
    case DriftType.ORPHAN_LICENSE:
      return 'FLAG_FOR_REVIEW';
  }
}
