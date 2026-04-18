/**
 * Tests: Reconciliation worker pure functions
 *
 * Governing docs:
 *   - docs/architecture.md §9.11.2 (5 reconciliation jobs)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/job-queue/
 *   - https://typesense.org/docs/27.1/api/collections.html
 *   - https://qdrant.tech/documentation/concepts/collections/
 *   - https://keygen.sh/docs/api/licenses/
 */
import { describe, it, expect } from 'vitest';
import {
  detectSearchIndexDrift,
  detectEmbeddingDrift,
  detectCustomerSyncDrift,
  detectLicenseDrift,
  detectAssetReferenceDrift,
  ReconciliationResult,
  DriftType,
} from './reconciliation-workers.service';

describe('ReconciliationWorkers', () => {
  describe('detectSearchIndexDrift', () => {
    it('returns no drift when sets match', () => {
      const vendureIds = ['p1', 'p2', 'p3'];
      const typesenseIds = ['p1', 'p2', 'p3'];
      const result = detectSearchIndexDrift(vendureIds, typesenseIds);
      expect(result.driftCount).toBe(0);
      expect(result.missingInIndex).toEqual([]);
      expect(result.orphansInIndex).toEqual([]);
    });

    it('detects missing products in search index', () => {
      const vendureIds = ['p1', 'p2', 'p3'];
      const typesenseIds = ['p1'];
      const result = detectSearchIndexDrift(vendureIds, typesenseIds);
      expect(result.missingInIndex).toEqual(['p2', 'p3']);
      expect(result.driftCount).toBe(2);
    });

    it('detects orphan entries in search index', () => {
      const vendureIds = ['p1'];
      const typesenseIds = ['p1', 'p2', 'deleted-1'];
      const result = detectSearchIndexDrift(vendureIds, typesenseIds);
      expect(result.orphansInIndex).toEqual(['p2', 'deleted-1']);
      expect(result.driftCount).toBe(2);
    });

    it('detects both missing and orphan drift', () => {
      const vendureIds = ['p1', 'p3'];
      const typesenseIds = ['p1', 'p2'];
      const result = detectSearchIndexDrift(vendureIds, typesenseIds);
      expect(result.missingInIndex).toEqual(['p3']);
      expect(result.orphansInIndex).toEqual(['p2']);
      expect(result.driftCount).toBe(2);
    });
  });

  describe('detectEmbeddingDrift', () => {
    it('returns no drift when sets match', () => {
      const vendureIds = ['p1', 'p2'];
      const qdrantIds = ['p1', 'p2'];
      const result = detectEmbeddingDrift(vendureIds, qdrantIds);
      expect(result.driftCount).toBe(0);
    });

    it('detects missing embeddings', () => {
      const vendureIds = ['p1', 'p2', 'p3'];
      const qdrantIds = ['p1'];
      const result = detectEmbeddingDrift(vendureIds, qdrantIds);
      expect(result.missingEmbeddings).toEqual(['p2', 'p3']);
      expect(result.driftCount).toBe(2);
    });

    it('detects orphan embeddings', () => {
      const vendureIds = ['p1'];
      const qdrantIds = ['p1', 'p2'];
      const result = detectEmbeddingDrift(vendureIds, qdrantIds);
      expect(result.orphanEmbeddings).toEqual(['p2']);
      expect(result.driftCount).toBe(1);
    });
  });

  describe('detectCustomerSyncDrift', () => {
    it('returns no drift when all synced', () => {
      const authUserIds = ['u1', 'u2'];
      const vendureCustomerIds = ['u1', 'u2'];
      const result = detectCustomerSyncDrift(authUserIds, vendureCustomerIds);
      expect(result.driftCount).toBe(0);
    });

    it('detects auth users without Vendure customer record', () => {
      const authUserIds = ['u1', 'u2', 'u3'];
      const vendureCustomerIds = ['u1'];
      const result = detectCustomerSyncDrift(authUserIds, vendureCustomerIds);
      expect(result.missingCustomers).toEqual(['u2', 'u3']);
      expect(result.driftCount).toBe(2);
    });

    it('detects orphan Vendure customers without auth record', () => {
      const authUserIds = ['u1'];
      const vendureCustomerIds = ['u1', 'deleted-user'];
      const result = detectCustomerSyncDrift(authUserIds, vendureCustomerIds);
      expect(result.orphanCustomers).toEqual(['deleted-user']);
      expect(result.driftCount).toBe(1);
    });
  });

  describe('detectLicenseDrift', () => {
    it('returns no drift when all licenses match orders', () => {
      const completedOrderProductPairs = [
        { orderId: 'o1', productId: 'p1' },
        { orderId: 'o2', productId: 'p2' },
      ];
      const activeLicenseKeys = [
        { licenseKey: 'lic-1', orderId: 'o1', productId: 'p1' },
        { licenseKey: 'lic-2', orderId: 'o2', productId: 'p2' },
      ];
      const result = detectLicenseDrift(completedOrderProductPairs, activeLicenseKeys);
      expect(result.driftCount).toBe(0);
    });

    it('detects orders missing licenses', () => {
      const completedOrderProductPairs = [
        { orderId: 'o1', productId: 'p1' },
        { orderId: 'o2', productId: 'p2' },
      ];
      const activeLicenseKeys = [
        { licenseKey: 'lic-1', orderId: 'o1', productId: 'p1' },
      ];
      const result = detectLicenseDrift(completedOrderProductPairs, activeLicenseKeys);
      expect(result.missingLicenses).toEqual([{ orderId: 'o2', productId: 'p2' }]);
      expect(result.driftCount).toBe(1);
    });

    it('detects orphan licenses without orders', () => {
      const completedOrderProductPairs = [
        { orderId: 'o1', productId: 'p1' },
      ];
      const activeLicenseKeys = [
        { licenseKey: 'lic-1', orderId: 'o1', productId: 'p1' },
        { licenseKey: 'lic-orphan', orderId: 'o-deleted', productId: 'p-deleted' },
      ];
      const result = detectLicenseDrift(completedOrderProductPairs, activeLicenseKeys);
      expect(result.orphanLicenses).toEqual([{ licenseKey: 'lic-orphan', orderId: 'o-deleted', productId: 'p-deleted' }]);
      expect(result.driftCount).toBe(1);
    });
  });

  describe('detectAssetReferenceDrift', () => {
    it('returns no drift when all assets are referenced', () => {
      const vendureAssetIds = ['a1', 'a2'];
      const cdngineAssetIds = ['a1', 'a2'];
      const result = detectAssetReferenceDrift(vendureAssetIds, cdngineAssetIds);
      expect(result.driftCount).toBe(0);
    });

    it('detects Vendure references to missing CDNgine assets', () => {
      const vendureAssetIds = ['a1', 'a2', 'a3'];
      const cdngineAssetIds = ['a1'];
      const result = detectAssetReferenceDrift(vendureAssetIds, cdngineAssetIds);
      expect(result.brokenReferences).toEqual(['a2', 'a3']);
      expect(result.driftCount).toBe(2);
    });

    it('detects unreferenced CDNgine assets (orphans)', () => {
      const vendureAssetIds = ['a1'];
      const cdngineAssetIds = ['a1', 'a-orphan'];
      const result = detectAssetReferenceDrift(vendureAssetIds, cdngineAssetIds);
      expect(result.orphanAssets).toEqual(['a-orphan']);
      expect(result.driftCount).toBe(1);
    });
  });

  describe('ReconciliationResult helpers', () => {
    it('calculates total drift across all results', () => {
      const searchResult = detectSearchIndexDrift(['p1', 'p2'], ['p1']);
      const embeddingResult = detectEmbeddingDrift(['p1', 'p2'], ['p1']);
      expect(searchResult.driftCount).toBe(1);
      expect(embeddingResult.driftCount).toBe(1);
    });
  });
});
