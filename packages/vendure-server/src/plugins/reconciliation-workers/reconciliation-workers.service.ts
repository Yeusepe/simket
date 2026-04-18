/**
 * Purpose: Pure-function reconciliation drift detection for 5 scheduled workers.
 *
 * Governing docs:
 *   - docs/architecture.md §9.11.2 (5 reconciliation jobs)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/job-queue/
 *   - https://typesense.org/docs/27.1/api/collections.html
 *   - https://qdrant.tech/documentation/concepts/collections/
 *   - https://keygen.sh/docs/api/licenses/
 * Tests:
 *   - src/plugins/reconciliation-workers/reconciliation-workers.service.test.ts
 */

export enum DriftType {
  SEARCH_INDEX = 'SEARCH_INDEX',
  EMBEDDING = 'EMBEDDING',
  CUSTOMER_SYNC = 'CUSTOMER_SYNC',
  LICENSE = 'LICENSE',
  ASSET_REFERENCE = 'ASSET_REFERENCE',
}

export interface ReconciliationResult {
  readonly driftType: DriftType;
  readonly driftCount: number;
  readonly timestamp: Date;
}

export interface SearchIndexDriftResult extends ReconciliationResult {
  readonly driftType: DriftType.SEARCH_INDEX;
  readonly missingInIndex: readonly string[];
  readonly orphansInIndex: readonly string[];
}

export interface EmbeddingDriftResult extends ReconciliationResult {
  readonly driftType: DriftType.EMBEDDING;
  readonly missingEmbeddings: readonly string[];
  readonly orphanEmbeddings: readonly string[];
}

export interface CustomerSyncDriftResult extends ReconciliationResult {
  readonly driftType: DriftType.CUSTOMER_SYNC;
  readonly missingCustomers: readonly string[];
  readonly orphanCustomers: readonly string[];
}

export interface OrderProductPair {
  readonly orderId: string;
  readonly productId: string;
}

export interface LicenseRecord {
  readonly licenseKey: string;
  readonly orderId: string;
  readonly productId: string;
}

export interface LicenseDriftResult extends ReconciliationResult {
  readonly driftType: DriftType.LICENSE;
  readonly missingLicenses: readonly OrderProductPair[];
  readonly orphanLicenses: readonly LicenseRecord[];
}

export interface AssetReferenceDriftResult extends ReconciliationResult {
  readonly driftType: DriftType.ASSET_REFERENCE;
  readonly brokenReferences: readonly string[];
  readonly orphanAssets: readonly string[];
}

/**
 * Daily 03:00 UTC — Search index reconciliation.
 * Compares Vendure published product IDs against Typesense indexed document IDs.
 */
export function detectSearchIndexDrift(
  vendureProductIds: readonly string[],
  typesenseDocumentIds: readonly string[],
): SearchIndexDriftResult {
  const vendureSet = new Set(vendureProductIds);
  const typesenseSet = new Set(typesenseDocumentIds);

  const missingInIndex = vendureProductIds.filter((id) => !typesenseSet.has(id));
  const orphansInIndex = typesenseDocumentIds.filter((id) => !vendureSet.has(id));

  return {
    driftType: DriftType.SEARCH_INDEX,
    driftCount: missingInIndex.length + orphansInIndex.length,
    missingInIndex,
    orphansInIndex,
    timestamp: new Date(),
  };
}

/**
 * Daily 04:00 UTC — Vector embedding reconciliation.
 * Compares Vendure published product IDs against Qdrant point IDs.
 */
export function detectEmbeddingDrift(
  vendureProductIds: readonly string[],
  qdrantPointIds: readonly string[],
): EmbeddingDriftResult {
  const vendureSet = new Set(vendureProductIds);
  const qdrantSet = new Set(qdrantPointIds);

  const missingEmbeddings = vendureProductIds.filter((id) => !qdrantSet.has(id));
  const orphanEmbeddings = qdrantPointIds.filter((id) => !vendureSet.has(id));

  return {
    driftType: DriftType.EMBEDDING,
    driftCount: missingEmbeddings.length + orphanEmbeddings.length,
    missingEmbeddings,
    orphanEmbeddings,
    timestamp: new Date(),
  };
}

/**
 * Daily 06:00 UTC — Customer sync reconciliation.
 * Compares Better Auth user IDs against Vendure Customer external IDs.
 */
export function detectCustomerSyncDrift(
  authUserIds: readonly string[],
  vendureCustomerExternalIds: readonly string[],
): CustomerSyncDriftResult {
  const authSet = new Set(authUserIds);
  const vendureSet = new Set(vendureCustomerExternalIds);

  const missingCustomers = authUserIds.filter((id) => !vendureSet.has(id));
  const orphanCustomers = vendureCustomerExternalIds.filter((id) => !authSet.has(id));

  return {
    driftType: DriftType.CUSTOMER_SYNC,
    driftCount: missingCustomers.length + orphanCustomers.length,
    missingCustomers,
    orphanCustomers,
    timestamp: new Date(),
  };
}

/**
 * Daily 05:00 UTC — License integrity reconciliation.
 * Compares Vendure completed software orders against Keygen active licenses.
 */
export function detectLicenseDrift(
  completedOrderProductPairs: readonly OrderProductPair[],
  activeLicenseRecords: readonly LicenseRecord[],
): LicenseDriftResult {
  const orderKeys = new Set(
    completedOrderProductPairs.map((p) => `${p.orderId}:${p.productId}`),
  );
  const licenseKeys = new Set(
    activeLicenseRecords.map((l) => `${l.orderId}:${l.productId}`),
  );

  const missingLicenses = completedOrderProductPairs.filter(
    (p) => !licenseKeys.has(`${p.orderId}:${p.productId}`),
  );
  const orphanLicenses = activeLicenseRecords.filter(
    (l) => !orderKeys.has(`${l.orderId}:${l.productId}`),
  );

  return {
    driftType: DriftType.LICENSE,
    driftCount: missingLicenses.length + orphanLicenses.length,
    missingLicenses,
    orphanLicenses,
    timestamp: new Date(),
  };
}

/**
 * Weekly Sunday 02:00 UTC — Asset reference reconciliation.
 * Compares Vendure-referenced CDNgine asset IDs against all CDNgine objects.
 */
export function detectAssetReferenceDrift(
  vendureReferencedAssetIds: readonly string[],
  cdngineObjectIds: readonly string[],
): AssetReferenceDriftResult {
  const vendureSet = new Set(vendureReferencedAssetIds);
  const cdngineSet = new Set(cdngineObjectIds);

  const brokenReferences = vendureReferencedAssetIds.filter((id) => !cdngineSet.has(id));
  const orphanAssets = cdngineObjectIds.filter((id) => !vendureSet.has(id));

  return {
    driftType: DriftType.ASSET_REFERENCE,
    driftCount: brokenReferences.length + orphanAssets.length,
    brokenReferences,
    orphanAssets,
    timestamp: new Date(),
  };
}
