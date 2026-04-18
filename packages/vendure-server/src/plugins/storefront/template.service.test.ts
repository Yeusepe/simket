/**
 * Purpose: Verify storefront template filtering, save-as-template flows, duplication, and delete invariants.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, Storefront plugin)
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/domain-model.md (§1 Core records, Storefront Template)
 * External references:
 *   - packages/vendure-server/node_modules/@vendure/core/dist/connection/transactional-connection.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/template.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { TransactionalConnection } from '@vendure/core';
import { StorePageEntity } from './storefront.entity.js';
import { TemplateEntity } from './template.entity.js';
import {
  TemplateService,
  cloneTemplateBlocks,
  createDuplicateTemplateName,
  extractTemplateBlocks,
  normalizeTemplateName,
} from './template.service.js';

class MemoryTemplateRepository {
  private readonly rows = new Map<string, TemplateEntity>();
  private nextId = 1;

  create(input: Partial<TemplateEntity>): TemplateEntity {
    return new TemplateEntity(input);
  }

  async save(entity: TemplateEntity): Promise<TemplateEntity> {
    if (!entity.id) {
      entity.id = `template-${this.nextId++}`;
    }

    entity.createdAt = entity.createdAt ?? new Date('2025-02-01T00:00:00.000Z');
    entity.updatedAt = new Date('2025-02-02T00:00:00.000Z');
    this.rows.set(entity.id, cloneTemplate(entity));
    return cloneTemplate(entity);
  }

  async find(): Promise<TemplateEntity[]> {
    return [...this.rows.values()].map(cloneTemplate);
  }

  async findOneBy(where: Partial<TemplateEntity>): Promise<TemplateEntity | null> {
    return [...this.rows.values()].find((row) => matchesWhere(row, where)) ?? null;
  }

  async remove(entity: TemplateEntity): Promise<TemplateEntity> {
    this.rows.delete(entity.id);
    return cloneTemplate(entity);
  }

  seed(entity: TemplateEntity): void {
    this.rows.set(entity.id, cloneTemplate(entity));
    this.nextId = Math.max(this.nextId, this.rows.size + 1);
  }
}

class MemoryStorePageRepository {
  private readonly rows = new Map<string, StorePageEntity>();

  async findOneBy(where: Partial<StorePageEntity>): Promise<StorePageEntity | null> {
    return [...this.rows.values()].find((row) => matchesWhere(row, where)) ?? null;
  }

  seed(entity: StorePageEntity): void {
    this.rows.set(entity.id, new StorePageEntity(entity));
  }
}

function matchesWhere<T extends object>(entity: T, where: Partial<T>): boolean {
  return Object.entries(where).every(([key, value]) => entity[key as keyof T] === value);
}

function cloneTemplate(entity: TemplateEntity): TemplateEntity {
  return new TemplateEntity({
    ...entity,
    blocks: cloneTemplateBlocks(entity.blocks),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

function createTemplate(overrides: Partial<TemplateEntity> = {}): TemplateEntity {
  const entity = new TemplateEntity({
    id: overrides.id ?? 'template-seeded',
    name: 'Landing Starter',
    description: 'Starter template',
    thumbnail: 'https://cdn.example.com/template.png',
    category: 'landing-page',
    blocks: [{ id: 'hero-1', type: 'hero', props: { title: 'Welcome' } }],
    isSystem: true,
    creatorId: null,
    usageCount: 10,
    ...overrides,
  });
  entity.createdAt = overrides.createdAt ?? new Date('2025-01-01T00:00:00.000Z');
  entity.updatedAt = overrides.updatedAt ?? new Date('2025-01-02T00:00:00.000Z');
  return entity;
}

function createStorePage(overrides: Partial<StorePageEntity> = {}): StorePageEntity {
  const entity = new StorePageEntity({
    id: overrides.id ?? 'page-1',
    title: 'Creator Store',
    slug: 'creator-store',
    scope: 'universal',
    productId: null,
    isPostSale: false,
    isTemplate: false,
    content:
      overrides.content ??
      JSON.stringify({
        version: 1,
        blocks: [{ id: 'hero-1', type: 'hero', props: { title: 'Storefront hero' } }],
      }),
    sortOrder: 0,
    enabled: true,
    ...overrides,
  });
  entity.createdAt = overrides.createdAt ?? new Date('2025-01-01T00:00:00.000Z');
  entity.updatedAt = overrides.updatedAt ?? new Date('2025-01-02T00:00:00.000Z');
  return entity;
}

function createService(options?: {
  readonly templates?: MemoryTemplateRepository;
  readonly pages?: MemoryStorePageRepository;
}) {
  const templateRepository = options?.templates ?? new MemoryTemplateRepository();
  const storePageRepository = options?.pages ?? new MemoryStorePageRepository();
  const connection = {
    getRepository: vi
      .fn()
      .mockImplementation((_ctx, entity) =>
        entity === TemplateEntity ? templateRepository : storePageRepository,
      ),
  } as unknown as Pick<TransactionalConnection, 'getRepository'>;

  return {
    service: new TemplateService(connection),
    templateRepository,
    storePageRepository,
  };
}

describe('template helpers', () => {
  it('normalizes template names and duplicate labels', () => {
    expect(normalizeTemplateName('  Creator Landing  ')).toBe('Creator Landing');
    expect(createDuplicateTemplateName('Landing Starter')).toBe('Landing Starter Copy');
  });

  it('extracts template blocks from store page schemas', () => {
    expect(
      extractTemplateBlocks(
        JSON.stringify({
          version: 1,
          blocks: [{ id: 'hero-1', type: 'hero', props: {} }],
        }),
      ),
    ).toEqual([{ id: 'hero-1', type: 'hero', props: {} }]);
  });
});

describe('TemplateService', () => {
  it('lists system templates plus a creator personal templates', async () => {
    const templates = new MemoryTemplateRepository();
    templates.seed(createTemplate({ id: 'system-1', isSystem: true, creatorId: null, category: 'store-page' }));
    templates.seed(createTemplate({ id: 'personal-1', isSystem: false, creatorId: 'creator-1', category: 'store-page' }));
    templates.seed(createTemplate({ id: 'personal-2', isSystem: false, creatorId: 'creator-2', category: 'product-page' }));
    const { service } = createService({ templates });

    const results = await service.listTemplates(undefined, {
      creatorId: 'creator-1',
      category: 'store-page',
      scope: 'all',
    });

    expect(results.map((template) => template.id)).toEqual(['system-1', 'personal-1']);
  });

  it('creates a personal template from an existing store page', async () => {
    const pages = new MemoryStorePageRepository();
    pages.seed(createStorePage());
    const { service, templateRepository } = createService({ pages });

    const template = await service.createTemplateFromPage(undefined, {
      pageId: 'page-1',
      name: 'Store Starter',
      description: 'Saved from the builder',
      thumbnail: 'https://cdn.example.com/thumb.png',
      category: 'store-page',
      creatorId: 'creator-1',
    });

    expect(template).toMatchObject({
      name: 'Store Starter',
      description: 'Saved from the builder',
      thumbnail: 'https://cdn.example.com/thumb.png',
      category: 'store-page',
      isSystem: false,
      creatorId: 'creator-1',
      usageCount: 0,
    });
    expect(template.blocks).toEqual([{ id: 'hero-1', type: 'hero', props: { title: 'Storefront hero' } }]);
    expect(await templateRepository.find()).toHaveLength(1);
  });

  it('duplicates a template for the owning creator and resets usage count', async () => {
    const templates = new MemoryTemplateRepository();
    templates.seed(
      createTemplate({
        id: 'template-1',
        isSystem: false,
        creatorId: 'creator-1',
        usageCount: 42,
        blocks: [{ id: 'block-1', type: 'button', props: { label: 'Buy' } }],
      }),
    );
    const { service } = createService({ templates });

    const duplicate = await service.duplicateTemplate(undefined, {
      templateId: 'template-1',
      creatorId: 'creator-1',
    });

    expect(duplicate.id).toBe('template-2');
    expect(duplicate.name).toBe('Landing Starter Copy');
    expect(duplicate.isSystem).toBe(false);
    expect(duplicate.creatorId).toBe('creator-1');
    expect(duplicate.usageCount).toBe(0);
    expect(duplicate.blocks).toEqual([{ id: 'block-1', type: 'button', props: { label: 'Buy' } }]);
  });

  it('deletes personal templates and rejects deleting system templates', async () => {
    const templates = new MemoryTemplateRepository();
    templates.seed(createTemplate({ id: 'personal-1', isSystem: false, creatorId: 'creator-1' }));
    templates.seed(createTemplate({ id: 'system-1', isSystem: true, creatorId: null }));
    const { service, templateRepository } = createService({ templates });

    await expect(service.deletePersonalTemplate(undefined, 'system-1', 'creator-1')).rejects.toThrow(
      /system templates cannot be deleted/i,
    );
    await expect(service.deletePersonalTemplate(undefined, 'personal-1', 'creator-2')).rejects.toThrow(
      /owning creator/i,
    );

    await expect(service.deletePersonalTemplate(undefined, 'personal-1', 'creator-1')).resolves.toBe(
      true,
    );
    expect((await templateRepository.find()).map((template) => template.id)).toEqual(['system-1']);
  });
});
