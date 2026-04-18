/**
 * Purpose: Unit tests for asset reference management helpers and service flows.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://typeorm.io/docs/working-with-entity-manager/repository-api/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - packages/vendure-server/node_modules/typeorm/repository/Repository.d.ts
 *   - packages/vendure-server/node_modules/@vendure/core/dist/entity/base/base.entity.d.ts
 * Tests:
 *   - packages/vendure-server/src/features/asset-refs/asset-ref.service.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { CreateAssetRefInput, EntityType, RefType } from './asset-ref.types.js';
import { AssetRefEntity } from './asset-ref.entity.js';
import {
  AssetRefService,
  buildAssetRefKey,
  isValidEntityType,
  isValidRefType,
} from './asset-ref.service.js';

class MemoryAssetRefRepository {
  private readonly rows = new Map<string, AssetRefEntity>();

  create(input: Partial<AssetRefEntity>): AssetRefEntity {
    return new AssetRefEntity(input);
  }

  async save(entity: AssetRefEntity): Promise<AssetRefEntity> {
    const now = entity.createdAt ?? new Date();
    entity.createdAt = now;
    entity.updatedAt = entity.updatedAt ?? now;
    entity.deletedAt = entity.deletedAt ?? null;
    this.rows.set(entity.id, cloneEntity(entity));
    return cloneEntity(entity);
  }

  async findOneBy(where: Partial<AssetRefEntity>): Promise<AssetRefEntity | null> {
    return (
      [...this.rows.values()].find((row) => matchesWhere(row, where) && row.deletedAt === null) ?? null
    );
  }

  async find(options?: {
    readonly where?: Partial<AssetRefEntity>;
    readonly withDeleted?: boolean;
  }): Promise<AssetRefEntity[]> {
    return [...this.rows.values()]
      .filter((row) => (options?.withDeleted ? true : row.deletedAt === null))
      .filter((row) => (options?.where ? matchesWhere(row, options.where) : true))
      .map(cloneEntity);
  }

  async softDelete(where: string | Partial<AssetRefEntity>): Promise<{ affected?: number }> {
    let affected = 0;
    const now = new Date();
    for (const row of this.rows.values()) {
      const matches =
        typeof where === 'string' ? row.id === where : matchesWhere(row, where);
      if (!matches || row.deletedAt !== null) {
        continue;
      }

      row.deletedAt = now;
      row.updatedAt = now;
      affected += 1;
    }

    return { affected };
  }

  async existsBy(where: Partial<AssetRefEntity>): Promise<boolean> {
    return [...this.rows.values()].some(
      (row) => matchesWhere(row, where) && row.deletedAt === null,
    );
  }

  async findBy(where: Partial<AssetRefEntity>): Promise<AssetRefEntity[]> {
    return this.find({ where });
  }

  seed(entity: AssetRefEntity): void {
    this.rows.set(entity.id, cloneEntity(entity));
  }

  rewindAsset(assetId: string, isoDate: string): void {
    const target = new Date(isoDate);
    for (const row of this.rows.values()) {
      if (row.assetId === assetId) {
        row.createdAt = target;
        row.updatedAt = target;
        if (row.deletedAt !== null) {
          row.deletedAt = target;
        }
      }
    }
  }
}

function cloneEntity(entity: AssetRefEntity): AssetRefEntity {
  return new AssetRefEntity({
    id: entity.id,
    assetId: entity.assetId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    refType: entity.refType,
    version: entity.version,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    deletedAt: entity.deletedAt,
  });
}

function matchesWhere(entity: AssetRefEntity, where: Partial<AssetRefEntity>): boolean {
  return Object.entries(where).every(([key, value]) => {
    return entity[key as keyof AssetRefEntity] === value;
  });
}

function createInput(overrides: Partial<CreateAssetRefInput> = {}): CreateAssetRefInput {
  return {
    assetId: 'asset-1',
    entityType: 'product',
    entityId: 'product-1',
    refType: 'hero',
    ...overrides,
  };
}

describe('isValidEntityType', () => {
  it('accepts supported entity types', () => {
    const validTypes: readonly EntityType[] = [
      'product',
      'storePage',
      'description',
      'editorial',
      'profile',
    ];

    for (const type of validTypes) {
      expect(isValidEntityType(type)).toBe(true);
    }
  });

  it('rejects unsupported entity types', () => {
    expect(isValidEntityType('bundle')).toBe(false);
    expect(isValidEntityType('')).toBe(false);
  });
});

describe('isValidRefType', () => {
  it('accepts supported reference types', () => {
    const validTypes: readonly RefType[] = [
      'hero',
      'heroTransparent',
      'gallery',
      'attachment',
      'inline',
      'download',
    ];

    for (const type of validTypes) {
      expect(isValidRefType(type)).toBe(true);
    }
  });

  it('rejects unsupported reference types', () => {
    expect(isValidRefType('thumbnail')).toBe(false);
    expect(isValidRefType('')).toBe(false);
  });
});

describe('buildAssetRefKey', () => {
  it('builds the expected stable key', () => {
    expect(buildAssetRefKey('product', 'product-123', 'gallery')).toBe(
      'product:product-123:gallery',
    );
  });
});

describe('AssetRefService', () => {
  it('createRef creates a reference with the expected fields', async () => {
    const repository = new MemoryAssetRefRepository();
    const service = new AssetRefService(repository);

    const created = await service.createRef(createInput());

    expect(created.assetId).toBe('asset-1');
    expect(created.entityType).toBe('product');
    expect(created.entityId).toBe('product-1');
    expect(created.refType).toBe('hero');
    expect(created.version).toBe(1);
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toMatch(/T/);
    expect(created.updatedAt).toMatch(/T/);
  });

  it('createRef rejects a duplicate active reference', async () => {
    const repository = new MemoryAssetRefRepository();
    const service = new AssetRefService(repository);
    await service.createRef(createInput());

    await expect(service.createRef(createInput())).rejects.toThrow(/already exists/i);
  });

  it('deleteRef returns true for an existing reference and false otherwise', async () => {
    const repository = new MemoryAssetRefRepository();
    const service = new AssetRefService(repository);
    const created = await service.createRef(createInput());

    await expect(service.deleteRef(created.id)).resolves.toBe(true);
    await expect(service.deleteRef(created.id)).resolves.toBe(false);
  });

  it('deleteRefsForEntity removes all active references for the entity and returns the count', async () => {
    const repository = new MemoryAssetRefRepository();
    const service = new AssetRefService(repository);
    await service.createRef(createInput({ assetId: 'asset-1', refType: 'hero' }));
    await service.createRef(createInput({ assetId: 'asset-2', refType: 'gallery' }));
    await service.createRef(createInput({ assetId: 'asset-3', entityId: 'product-2' }));

    await expect(service.deleteRefsForEntity('product', 'product-1')).resolves.toBe(2);
    await expect(service.getRefsForEntity('product', 'product-1')).resolves.toEqual([]);
    await expect(service.getRefsForEntity('product', 'product-2')).resolves.toHaveLength(1);
  });

  it('getRefsForAsset returns all active references for the asset', async () => {
    const repository = new MemoryAssetRefRepository();
    const service = new AssetRefService(repository);
    await service.createRef(createInput({ assetId: 'asset-1', entityId: 'product-1' }));
    await service.createRef(
      createInput({ assetId: 'asset-1', entityId: 'product-2', refType: 'gallery' }),
    );
    await service.createRef(createInput({ assetId: 'asset-2', entityId: 'product-3' }));

    const refs = await service.getRefsForAsset('asset-1');

    expect(refs).toHaveLength(2);
    expect(refs.map((ref) => ref.entityId).sort()).toEqual(['product-1', 'product-2']);
  });

  it('getRefsForEntity returns all active assets for the entity', async () => {
    const repository = new MemoryAssetRefRepository();
    const service = new AssetRefService(repository);
    await service.createRef(createInput({ assetId: 'asset-1', refType: 'hero' }));
    await service.createRef(createInput({ assetId: 'asset-2', refType: 'gallery' }));
    await service.createRef(createInput({ assetId: 'asset-3', entityId: 'product-2' }));

    const refs = await service.getRefsForEntity('product', 'product-1');

    expect(refs).toHaveLength(2);
    expect(refs.map((ref) => ref.assetId).sort()).toEqual(['asset-1', 'asset-2']);
  });

  it('getUsageSummary reports count, entity types, and orphan state', async () => {
    const repository = new MemoryAssetRefRepository();
    const service = new AssetRefService(repository);
    await service.createRef(createInput({ assetId: 'asset-1', entityType: 'product' }));
    await service.createRef(
      createInput({
        assetId: 'asset-1',
        entityType: 'description',
        entityId: 'description-1',
        refType: 'inline',
      }),
    );

    await expect(service.getUsageSummary('asset-1')).resolves.toEqual({
      assetId: 'asset-1',
      referenceCount: 2,
      entityTypes: ['description', 'product'],
      isOrphaned: false,
    });
    await expect(service.getUsageSummary('asset-missing')).resolves.toEqual({
      assetId: 'asset-missing',
      referenceCount: 0,
      entityTypes: [],
      isOrphaned: true,
    });
  });

  it('findOrphanedAssets returns only assets with no active references older than the cutoff', async () => {
    const repository = new MemoryAssetRefRepository();
    const service = new AssetRefService(repository);
    const orphan = await service.createRef(createInput({ assetId: 'asset-old-orphan' }));
    const active = await service.createRef(createInput({ assetId: 'asset-still-used' }));
    const recent = await service.createRef(createInput({ assetId: 'asset-recently-deleted' }));

    await service.deleteRef(orphan.id);
    await service.deleteRef(recent.id);

    repository.rewindAsset('asset-old-orphan', '2024-01-01T00:00:00.000Z');
    repository.rewindAsset('asset-recently-deleted', '2099-01-01T00:00:00.000Z');
    repository.seed(
      new AssetRefEntity({
        id: active.id,
        assetId: active.assetId,
        entityType: 'product',
        entityId: 'product-1',
        refType: 'hero',
        version: 1,
        createdAt: new Date(active.createdAt),
        updatedAt: new Date(active.updatedAt),
        deletedAt: null,
      }),
    );

    await expect(service.findOrphanedAssets(30)).resolves.toEqual(['asset-old-orphan']);
  });

  it('isAssetInUse returns true when active references exist and false otherwise', async () => {
    const repository = new MemoryAssetRefRepository();
    const service = new AssetRefService(repository);
    const created = await service.createRef(createInput({ assetId: 'asset-1' }));

    await expect(service.isAssetInUse('asset-1')).resolves.toBe(true);

    await service.deleteRef(created.id);

    await expect(service.isAssetInUse('asset-1')).resolves.toBe(false);
  });

  it('replaceAsset soft-deletes the old reference and creates a new versioned reference', async () => {
    const repository = new MemoryAssetRefRepository();
    const service = new AssetRefService(repository);
    await service.createRef(createInput({ assetId: 'asset-old' }));

    const replacement = await service.replaceAsset(
      'asset-old',
      'asset-new',
      'product',
      'product-1',
    );

    expect(replacement.assetId).toBe('asset-new');
    expect(replacement.version).toBe(2);
    await expect(service.getRefsForAsset('asset-old')).resolves.toEqual([]);
    await expect(service.getRefsForEntity('product', 'product-1')).resolves.toEqual([
      replacement,
    ]);
  });
});
