/**
 * Purpose: Verify creator-owned storefront page CRUD through the Storefront plugin service.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, §12 source of truth)
 *   - docs/service-architecture.md (§7.7 Storefront plugin)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - packages/vendure-server/node_modules/@vendure/core/dist/connection/transactional-connection.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/storefront.service.test.ts
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestContext, TransactionalConnection } from '@vendure/core';
import { StorePageEntity } from './storefront.entity.js';
import { DEFAULT_PRODUCT_PAGE_SLUG, StorefrontPageService } from './storefront.service.js';

class MemoryStorePageRepository {
  private readonly rows = new Map<string, StorePageEntity>();
  private nextId = 1;

  create(input: Partial<StorePageEntity>): StorePageEntity {
    return new StorePageEntity(input);
  }

  async save(entity: StorePageEntity): Promise<StorePageEntity> {
    if (!entity.id) {
      entity.id = `page-${this.nextId++}`;
    }

    entity.createdAt = entity.createdAt ?? new Date('2025-02-01T00:00:00.000Z');
    entity.updatedAt = new Date('2025-02-02T00:00:00.000Z');
    this.rows.set(String(entity.id), clonePage(entity));
    return clonePage(entity);
  }

  async find(): Promise<StorePageEntity[]> {
    return [...this.rows.values()].map(clonePage);
  }

  async findOneBy(where: Partial<StorePageEntity>): Promise<StorePageEntity | null> {
    return [...this.rows.values()].find((row) => matchesWhere(row, where)) ?? null;
  }

  async remove(entity: StorePageEntity): Promise<StorePageEntity> {
    this.rows.delete(String(entity.id));
    return clonePage(entity);
  }

  seed(entity: StorePageEntity): void {
    this.rows.set(String(entity.id), clonePage(entity));
  }
}

function matchesWhere<T extends object>(entity: T, where: Partial<T>): boolean {
  return Object.entries(where).every(([key, value]) => entity[key as keyof T] === value);
}

function clonePage(entity: StorePageEntity): StorePageEntity {
  return new StorePageEntity({
    ...entity,
    content: `${entity.content}`,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

function createService(options?: {
  readonly pages?: MemoryStorePageRepository;
  readonly customerService?: { findOneByUserId: ReturnType<typeof vi.fn> };
  readonly productService?: { findAll: ReturnType<typeof vi.fn> };
}) {
  const pageRepository = options?.pages ?? new MemoryStorePageRepository();
  const connection = {
    getRepository: vi.fn().mockReturnValue(pageRepository),
  } as unknown as Pick<TransactionalConnection, 'getRepository'>;

  const customerService =
    options?.customerService
    ?? {
      findOneByUserId: vi.fn().mockResolvedValue({
        customFields: {
          betterAuthRole: 'creator',
          betterAuthUserId: 'creator-1',
        },
      }),
    };

  const productService =
    options?.productService
    ?? {
      findAll: vi.fn().mockResolvedValue({ items: [] }),
    };

  return {
    service: new StorefrontPageService(
      connection as TransactionalConnection,
      customerService as never,
      productService as never,
    ),
    pageRepository,
  };
}

describe('StorefrontPageService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a creator-owned product page with serialized schema content', async () => {
    const { service, pageRepository } = createService();

    const page = await service.upsertCreatorStorefrontPage({ activeUserId: 'user-1' } as RequestContext, {
      title: 'Product detail',
      slug: DEFAULT_PRODUCT_PAGE_SLUG,
      scope: 'product',
      productId: 'product-42',
      content: {
        version: 1,
        blocks: [{ id: 'product-hero', type: 'hero', props: { title: 'Custom page' } }],
      },
    });

    expect(page).toMatchObject({
      title: 'Product detail',
      slug: DEFAULT_PRODUCT_PAGE_SLUG,
      scope: 'product',
      productId: 'product-42',
    });
    await expect(
      pageRepository.findOneBy({ creatorId: 'creator-1', productId: 'product-42' }),
    ).resolves.not.toBeNull();
  });

  it('loads a creator-owned page for the dashboard editor', async () => {
    const pages = new MemoryStorePageRepository();
    pages.seed(
      new StorePageEntity({
        id: 'page-9',
        title: 'Product detail',
        slug: DEFAULT_PRODUCT_PAGE_SLUG,
        creatorId: 'creator-1',
        scope: 'product',
        productId: 'product-9',
        isPostSale: false,
        isTemplate: false,
        content: JSON.stringify({
          version: 1,
          blocks: [{ id: 'hero-1', type: 'hero', props: { title: 'Custom product page' } }],
        }),
        sortOrder: 0,
        enabled: true,
      }),
    );
    const { service } = createService({ pages });

    const page = await service.getCreatorStorefrontPage(
      { activeUserId: 'user-1' } as RequestContext,
      'product',
      DEFAULT_PRODUCT_PAGE_SLUG,
      'product-9',
    );

    expect(page?.id).toBe('page-9');
    expect(page?.schema).toEqual(
      expect.objectContaining({
        version: 1,
      }),
    );
  });

  it('deletes only creator-owned pages', async () => {
    const pages = new MemoryStorePageRepository();
    pages.seed(
      new StorePageEntity({
        id: 'page-delete',
        title: 'Store Home',
        slug: 'home',
        creatorId: 'creator-1',
        scope: 'universal',
        productId: null,
        isPostSale: false,
        isTemplate: false,
        content: JSON.stringify({ version: 1, blocks: [] }),
        sortOrder: 0,
        enabled: true,
      }),
    );
    const { service, pageRepository } = createService({ pages });

    await expect(
      service.deleteCreatorStorefrontPage({ activeUserId: 'user-1' } as RequestContext, 'page-delete'),
    ).resolves.toBe(true);
    await expect(pageRepository.findOneBy({ id: 'page-delete' })).resolves.toBeNull();
  });
});
