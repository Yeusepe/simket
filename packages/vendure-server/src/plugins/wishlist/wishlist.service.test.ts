/**
 * Purpose: Verify wishlist persistence, idempotent adds, pagination, and removal semantics.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/domain-model.md (§1 core records)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 * Tests:
 *   - packages/vendure-server/src/plugins/wishlist/wishlist.service.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { ProductService, TransactionalConnection } from '@vendure/core';
import { WishlistItem } from './wishlist.entity.js';
import { WishlistService } from './wishlist.service.js';

class MemoryWishlistRepository {
  private readonly rows = new Map<string, WishlistItem>();
  private nextId = 1;

  create(input: Partial<WishlistItem>): WishlistItem {
    return new WishlistItem(input);
  }

  async save(entity: WishlistItem): Promise<WishlistItem> {
    if (!entity.id) {
      entity.id = `wishlist-${this.nextId++}`;
    }

    entity.createdAt = entity.createdAt ?? new Date('2025-02-14T10:00:00.000Z');
    entity.updatedAt = new Date(entity.createdAt);
    entity.addedAt = entity.addedAt ?? entity.createdAt;
    this.rows.set(entity.id, cloneWishlistItem(entity));
    return cloneWishlistItem(entity);
  }

  async findOneBy(where: Partial<WishlistItem>): Promise<WishlistItem | null> {
    return [...this.rows.values()].find((row) => matchesWhere(row, where)) ?? null;
  }

  async findAndCount(options: {
    readonly where?: Partial<WishlistItem>;
    readonly skip?: number;
    readonly take?: number;
  }): Promise<[WishlistItem[], number]> {
    const matching = [...this.rows.values()]
      .filter((row) => (options.where ? matchesWhere(row, options.where) : true))
      .sort((left, right) => right.addedAt.getTime() - left.addedAt.getTime())
      .map(cloneWishlistItem);

    const start = options.skip ?? 0;
    const end = options.take ? start + options.take : undefined;
    return [matching.slice(start, end), matching.length];
  }

  async count(options?: { readonly where?: Partial<WishlistItem> }): Promise<number> {
    return [...this.rows.values()].filter((row) =>
      options?.where ? matchesWhere(row, options.where) : true,
    ).length;
  }

  async remove(entity: WishlistItem): Promise<WishlistItem> {
    this.rows.delete(entity.id);
    return cloneWishlistItem(entity);
  }
}

function cloneWishlistItem(item: WishlistItem): WishlistItem {
  return new WishlistItem({
    ...item,
    addedAt: new Date(item.addedAt),
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  });
}

function matchesWhere<T extends object>(entity: T, where: Partial<T>): boolean {
  return Object.entries(where).every(([key, value]) => entity[key as keyof T] === value);
}

function createProduct(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    slug: `product-${id}`,
    name: `Product ${id}`,
    description: `Description ${id}`,
    featuredAsset: { preview: `https://cdn.example.com/${id}.webp` },
    variants: [{ price: 1999, currencyCode: 'USD' }],
    facetValues: [{ name: 'unity' }],
    ...overrides,
  };
}

function createService() {
  const repository = new MemoryWishlistRepository();
  const products = new Map([
    ['product-1', createProduct('product-1')],
    ['product-2', createProduct('product-2', { name: 'Second Product' })],
    ['product-3', createProduct('product-3', { name: 'Third Product' })],
  ]);

  const connection = {
    getRepository: vi.fn().mockReturnValue(repository),
  } as unknown as Pick<TransactionalConnection, 'getRepository'>;

  const productService = {
    findOne: vi.fn(async (_ctx, productId: string | number) => products.get(String(productId))),
    findByIds: vi.fn(async (_ctx, productIds: ReadonlyArray<string | number>) =>
      productIds
        .map((productId) => products.get(String(productId)))
        .filter((product): product is NonNullable<typeof product> => Boolean(product))),
  } as unknown as ProductService;

  return {
    service: new WishlistService(connection, productService),
    repository,
    productService,
  };
}

describe('WishlistService', () => {
  it('adds wishlist items when the product exists', async () => {
    const { service } = createService();

    const created = await service.addToWishlist('customer-1', 'product-1');

    expect(created.productId).toBe('product-1');
    expect(created.customerId).toBe('customer-1');
    expect(created.notifyOnPriceDrop).toBe(false);
  });

  it('keeps adds idempotent and updates the notify flag', async () => {
    const { service } = createService();

    await service.addToWishlist('customer-1', 'product-1', false);
    const updated = await service.addToWishlist('customer-1', 'product-1', true);

    expect(updated.notifyOnPriceDrop).toBe(true);
    await expect(service.getWishlistCount('customer-1')).resolves.toBe(1);
    await expect(service.isInWishlist('customer-1', 'product-1')).resolves.toBe(true);
  });

  it('throws when attempting to add a missing product', async () => {
    const { service } = createService();

    await expect(service.addToWishlist('customer-1', 'missing-product')).rejects.toThrow(
      'Product "missing-product" does not exist.',
    );
  });

  it('paginates wishlist items with hydrated product data and supports removal', async () => {
    const { service, repository } = createService();
    await repository.save(new WishlistItem({
      customerId: 'customer-1',
      productId: 'product-1',
      addedAt: new Date('2025-02-14T09:00:00.000Z'),
      notifyOnPriceDrop: false,
      createdAt: new Date('2025-02-14T09:00:00.000Z'),
      updatedAt: new Date('2025-02-14T09:00:00.000Z'),
    }));
    await repository.save(new WishlistItem({
      customerId: 'customer-1',
      productId: 'product-2',
      addedAt: new Date('2025-02-14T10:00:00.000Z'),
      notifyOnPriceDrop: true,
      createdAt: new Date('2025-02-14T10:00:00.000Z'),
      updatedAt: new Date('2025-02-14T10:00:00.000Z'),
    }));
    await repository.save(new WishlistItem({
      customerId: 'customer-1',
      productId: 'product-3',
      addedAt: new Date('2025-02-14T11:00:00.000Z'),
      notifyOnPriceDrop: false,
      createdAt: new Date('2025-02-14T11:00:00.000Z'),
      updatedAt: new Date('2025-02-14T11:00:00.000Z'),
    }));

    const page = await service.getWishlist('customer-1', { page: 2, limit: 1 });

    expect(page.totalItems).toBe(3);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.product.name).toBe('Second Product');

    await expect(service.removeFromWishlist('customer-1', 'product-2')).resolves.toBe(true);
    await expect(service.getWishlistCount('customer-1')).resolves.toBe(2);
    await expect(service.isInWishlist('customer-1', 'product-2')).resolves.toBe(false);
  });
});
