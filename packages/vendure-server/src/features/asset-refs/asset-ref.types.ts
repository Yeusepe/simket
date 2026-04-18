/**
 * Purpose: Public asset reference contracts for Vendure-side asset usage tracking.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://typeorm.io/docs/working-with-entity-manager/repository-api/
 * Tests:
 *   - packages/vendure-server/src/features/asset-refs/asset-ref.service.test.ts
 */
export type EntityType = 'product' | 'storePage' | 'description' | 'editorial' | 'profile';

export type RefType =
  | 'hero'
  | 'heroTransparent'
  | 'gallery'
  | 'attachment'
  | 'inline'
  | 'download';

export interface AssetReference {
  readonly id: string;
  readonly assetId: string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly refType: RefType;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateAssetRefInput {
  readonly assetId: string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly refType: RefType;
}

export interface AssetUsageSummary {
  readonly assetId: string;
  readonly referenceCount: number;
  readonly entityTypes: readonly EntityType[];
  readonly isOrphaned: boolean;
}
