/**
 * Purpose: Tests for LicenseReconciliationService — drift detection between
 * Vendure orders and Keygen licenses.
 *
 * Governing docs:
 *   - docs/architecture.md §11 (Licensing — Keygen)
 * External references:
 *   - https://keygen.sh/docs/api/licenses/
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  detectLicenseDrift,
  classifyDriftAction,
  DriftType,
  type LicenseRecord,
  type OrderRecord,
} from './license-reconciliation.service.js';

describe('LicenseReconciliationService', () => {
  const orders: OrderRecord[] = [
    { orderId: 'order-1', productId: 'prod-1', customerId: 'cust-1', completedAt: '2025-01-01' },
    { orderId: 'order-2', productId: 'prod-2', customerId: 'cust-2', completedAt: '2025-01-02' },
    { orderId: 'order-3', productId: 'prod-3', customerId: 'cust-3', completedAt: '2025-01-03' },
  ];

  const licenses: LicenseRecord[] = [
    { licenseId: 'lic-1', orderId: 'order-1', productId: 'prod-1', status: 'active' },
    // order-2 missing license
    { licenseId: 'lic-orphan', orderId: 'order-999', productId: 'prod-x', status: 'active' },
    { licenseId: 'lic-3', orderId: 'order-3', productId: 'prod-3', status: 'active' },
  ];

  describe('detectLicenseDrift', () => {
    it('detects missing licenses for completed orders', () => {
      const drift = detectLicenseDrift(orders, licenses);
      const missing = drift.filter((d) => d.type === DriftType.MISSING_LICENSE);
      expect(missing).toHaveLength(1);
      expect(missing[0].orderId).toBe('order-2');
    });

    it('detects orphan licenses without matching orders', () => {
      const drift = detectLicenseDrift(orders, licenses);
      const orphans = drift.filter((d) => d.type === DriftType.ORPHAN_LICENSE);
      expect(orphans).toHaveLength(1);
      expect(orphans[0].licenseId).toBe('lic-orphan');
    });

    it('returns empty drift for perfectly matched data', () => {
      const matchedOrders: OrderRecord[] = [
        { orderId: 'o1', productId: 'p1', customerId: 'c1', completedAt: '2025-01-01' },
      ];
      const matchedLicenses: LicenseRecord[] = [
        { licenseId: 'l1', orderId: 'o1', productId: 'p1', status: 'active' },
      ];
      const drift = detectLicenseDrift(matchedOrders, matchedLicenses);
      expect(drift).toHaveLength(0);
    });

    it('handles empty inputs', () => {
      expect(detectLicenseDrift([], [])).toHaveLength(0);
    });

    it('all orders missing = all drift', () => {
      const drift = detectLicenseDrift(orders, []);
      expect(drift).toHaveLength(3);
      expect(drift.every((d) => d.type === DriftType.MISSING_LICENSE)).toBe(true);
    });
  });

  describe('classifyDriftAction', () => {
    it('returns CREATE for missing license', () => {
      expect(classifyDriftAction(DriftType.MISSING_LICENSE)).toBe('CREATE_LICENSE');
    });

    it('returns FLAG for orphan license', () => {
      expect(classifyDriftAction(DriftType.ORPHAN_LICENSE)).toBe('FLAG_FOR_REVIEW');
    });
  });
});
