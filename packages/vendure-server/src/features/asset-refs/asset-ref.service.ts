/**
 * Purpose: Asset reference service for tracking usage, guarding deletion, and versioned replacement.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://typeorm.io/docs/working-with-entity-manager/repository-api/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/#create-spans
 *   - packages/vendure-server/node_modules/typeorm/repository/Repository.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/asset-refs/asset-ref.service.test.ts
 */
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace, type Span, type Tracer } from '@opentelemetry/api';
import { AssetRefEntity } from './asset-ref.entity.js';
import type {
  AssetReference,
  AssetUsageSummary,
  CreateAssetRefInput,
  EntityType,
  RefType,
} from './asset-ref.types.js';

const ENTITY_TYPES = [
  'product',
  'storePage',
  'description',
  'editorial',
  'profile',
] as const satisfies readonly EntityType[];

const REF_TYPES = [
  'hero',
  'heroTransparent',
  'gallery',
  'attachment',
  'inline',
  'download',
] as const satisfies readonly RefType[];

interface AssetRefRepository {
  create(input: Partial<AssetRefEntity>): AssetRefEntity;
  save(entity: AssetRefEntity): Promise<AssetRefEntity>;
  find(options?: {
    readonly where?: Partial<AssetRefEntity>;
    readonly withDeleted?: boolean;
  }): Promise<AssetRefEntity[]>;
  findOneBy(where: Partial<AssetRefEntity>): Promise<AssetRefEntity | null>;
  softDelete(criteria: string | Partial<AssetRefEntity>): Promise<{ affected?: number | null }>;
  existsBy(where: Partial<AssetRefEntity>): Promise<boolean>;
}

export function isValidEntityType(type: string): type is EntityType {
  return ENTITY_TYPES.includes(type as EntityType);
}

export function isValidRefType(type: string): type is RefType {
  return REF_TYPES.includes(type as RefType);
}

export function buildAssetRefKey(
  entityType: EntityType,
  entityId: string,
  refType: RefType,
): string {
  return `${entityType}:${entityId}:${refType}`;
}

@Injectable()
export class AssetRefService {
  private readonly tracer: Tracer;

  constructor(
    private readonly repository: AssetRefRepository,
    tracer?: Tracer,
  ) {
    this.tracer = tracer ?? trace.getTracer('simket-asset-refs');
  }

  async createRef(input: CreateAssetRefInput): Promise<AssetReference> {
    this.assertCreateInput(input);

    return this.runInSpan(
      'assetRefs.createRef',
      {
        'asset_ref.asset_id': input.assetId,
        'asset_ref.entity_type': input.entityType,
        'asset_ref.entity_id': input.entityId,
        'asset_ref.ref_type': input.refType,
      },
      async (span) => {
        const existing = await this.repository.findOneBy({
          assetId: input.assetId,
          entityType: input.entityType,
          entityId: input.entityId,
          refType: input.refType,
        });

        if (existing) {
          throw new Error(
            `Asset reference already exists for ${buildAssetRefKey(
              input.entityType,
              input.entityId,
              input.refType,
            )}`,
          );
        }

        const entity = this.repository.create({
          id: randomUUID(),
          assetId: input.assetId,
          entityType: input.entityType,
          entityId: input.entityId,
          refType: input.refType,
          version: 1,
        });

        const saved = await this.repository.save(entity);
        span.setAttribute('asset_ref.version', saved.version);
        return this.toAssetReference(saved);
      },
    );
  }

  async deleteRef(id: string): Promise<boolean> {
    this.assertNonEmpty(id, 'id');

    return this.runInSpan('assetRefs.deleteRef', { 'asset_ref.id': id }, async (span) => {
      const result = await this.repository.softDelete(id);
      const deleted = (result.affected ?? 0) > 0;
      span.setAttribute('asset_ref.deleted', deleted);
      return deleted;
    });
  }

  async deleteRefsForEntity(entityType: EntityType, entityId: string): Promise<number> {
    this.assertEntityScope(entityType, entityId);

    return this.runInSpan(
      'assetRefs.deleteRefsForEntity',
      {
        'asset_ref.entity_type': entityType,
        'asset_ref.entity_id': entityId,
      },
      async (span) => {
        const result = await this.repository.softDelete({ entityType, entityId });
        const affected = result.affected ?? 0;
        span.setAttribute('asset_ref.deleted_count', affected);
        return affected;
      },
    );
  }

  async getRefsForAsset(assetId: string): Promise<AssetReference[]> {
    this.assertNonEmpty(assetId, 'assetId');

    return this.runInSpan(
      'assetRefs.getRefsForAsset',
      { 'asset_ref.asset_id': assetId },
      async (span) => {
        const refs = await this.repository.find({ where: { assetId } });
        span.setAttribute('asset_ref.reference_count', refs.length);
        return refs.sort(compareRefs).map((ref) => this.toAssetReference(ref));
      },
    );
  }

  async getRefsForEntity(entityType: EntityType, entityId: string): Promise<AssetReference[]> {
    this.assertEntityScope(entityType, entityId);

    return this.runInSpan(
      'assetRefs.getRefsForEntity',
      {
        'asset_ref.entity_type': entityType,
        'asset_ref.entity_id': entityId,
      },
      async (span) => {
        const refs = await this.repository.find({ where: { entityType, entityId } });
        span.setAttribute('asset_ref.reference_count', refs.length);
        return refs.sort(compareRefs).map((ref) => this.toAssetReference(ref));
      },
    );
  }

  async getUsageSummary(assetId: string): Promise<AssetUsageSummary> {
    this.assertNonEmpty(assetId, 'assetId');

    return this.runInSpan(
      'assetRefs.getUsageSummary',
      { 'asset_ref.asset_id': assetId },
      async (span) => {
        const refs = await this.repository.find({ where: { assetId } });
        const entityTypes = [...new Set(refs.map((ref) => ref.entityType))].sort();
        const summary: AssetUsageSummary = {
          assetId,
          referenceCount: refs.length,
          entityTypes,
          isOrphaned: refs.length === 0,
        };

        span.setAttribute('asset_ref.reference_count', summary.referenceCount);
        span.setAttribute('asset_ref.is_orphaned', summary.isOrphaned);
        return summary;
      },
    );
  }

  async findOrphanedAssets(olderThanDays: number): Promise<string[]> {
    if (!Number.isInteger(olderThanDays) || olderThanDays < 0) {
      throw new Error('olderThanDays must be a non-negative integer');
    }

    return this.runInSpan(
      'assetRefs.findOrphanedAssets',
      { 'asset_ref.older_than_days': olderThanDays },
      async (span) => {
        const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        const refs = await this.repository.find({ withDeleted: true });
        const refsByAsset = new Map<string, AssetRefEntity[]>();

        for (const ref of refs) {
          const group = refsByAsset.get(ref.assetId) ?? [];
          group.push(ref);
          refsByAsset.set(ref.assetId, group);
        }

        const orphaned = [...refsByAsset.entries()]
          .filter(([, group]) => group.every((ref) => ref.deletedAt !== null))
          .filter(([, group]) =>
            group.every((ref) => (ref.deletedAt ?? ref.updatedAt).getTime() <= cutoffTime),
          )
          .map(([assetId]) => assetId)
          .sort();

        span.setAttribute('asset_ref.orphan_count', orphaned.length);
        return orphaned;
      },
    );
  }

  async isAssetInUse(assetId: string): Promise<boolean> {
    this.assertNonEmpty(assetId, 'assetId');

    return this.runInSpan(
      'assetRefs.isAssetInUse',
      { 'asset_ref.asset_id': assetId },
      async (span) => {
        const inUse = await this.repository.existsBy({ assetId });
        span.setAttribute('asset_ref.in_use', inUse);
        return inUse;
      },
    );
  }

  async replaceAsset(
    oldAssetId: string,
    newAssetId: string,
    entityType: EntityType,
    entityId: string,
  ): Promise<AssetReference> {
    this.assertEntityScope(entityType, entityId);
    this.assertNonEmpty(oldAssetId, 'oldAssetId');
    this.assertNonEmpty(newAssetId, 'newAssetId');

    return this.runInSpan(
      'assetRefs.replaceAsset',
      {
        'asset_ref.old_asset_id': oldAssetId,
        'asset_ref.new_asset_id': newAssetId,
        'asset_ref.entity_type': entityType,
        'asset_ref.entity_id': entityId,
      },
      async (span) => {
        const existing = await this.repository.findOneBy({
          assetId: oldAssetId,
          entityType,
          entityId,
        });

        if (!existing) {
          throw new Error(`No active asset reference found for asset "${oldAssetId}"`);
        }

        const duplicateNew = await this.repository.findOneBy({
          assetId: newAssetId,
          entityType,
          entityId,
          refType: existing.refType,
        });

        if (duplicateNew) {
          throw new Error(`Asset "${newAssetId}" is already referenced by this entity slot`);
        }

        await this.repository.softDelete(existing.id);

        const historicalRefs = await this.repository.find({
          withDeleted: true,
          where: {
            entityType,
            entityId,
            refType: existing.refType,
          },
        });
        const nextVersion =
          historicalRefs.reduce((max, ref) => Math.max(max, ref.version), 0) + 1;

        const replacement = this.repository.create({
          id: randomUUID(),
          assetId: newAssetId,
          entityType,
          entityId,
          refType: existing.refType,
          version: nextVersion,
        });

        const saved = await this.repository.save(replacement);
        span.setAttribute('asset_ref.version', saved.version);
        return this.toAssetReference(saved);
      },
    );
  }

  private assertCreateInput(input: CreateAssetRefInput): void {
    this.assertNonEmpty(input.assetId, 'assetId');
    this.assertEntityScope(input.entityType, input.entityId);
    if (!isValidRefType(input.refType)) {
      throw new Error(`Unsupported asset reference type "${input.refType}"`);
    }
  }

  private assertEntityScope(entityType: string, entityId: string): asserts entityType is EntityType {
    if (!isValidEntityType(entityType)) {
      throw new Error(`Unsupported asset entity type "${entityType}"`);
    }
    this.assertNonEmpty(entityId, 'entityId');
  }

  private assertNonEmpty(value: string, name: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error(`${name} must not be empty`);
    }
  }

  private toAssetReference(entity: AssetRefEntity): AssetReference {
    return {
      id: entity.id,
      assetId: entity.assetId,
      entityType: entity.entityType,
      entityId: entity.entityId,
      refType: entity.refType,
      version: entity.version,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private async runInSpan<T>(
    name: string,
    attributes: Record<string, string | number | boolean>,
    operation: (span: Span) => Promise<T>,
  ): Promise<T> {
    return this.tracer.startActiveSpan(name, async (span) => {
      Object.entries(attributes).forEach(([key, value]) => span.setAttribute(key, value));
      try {
        return await operation(span);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

function compareRefs(left: AssetRefEntity, right: AssetRefEntity): number {
  return (
    left.version - right.version ||
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.assetId.localeCompare(right.assetId)
  );
}
