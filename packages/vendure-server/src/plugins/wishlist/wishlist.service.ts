/**
 * Purpose: Persist and hydrate storefront wishlist data with product summaries and tracing.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/domain-model.md (§1 core records)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - https://opentelemetry.io/docs/languages/js/instrumentation/
 * Tests:
 *   - packages/vendure-server/src/plugins/wishlist/wishlist.service.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { TransactionalConnection, type RequestContext } from '@vendure/core';
import { ProductService } from '@vendure/core';
import { WishlistItem } from './wishlist.entity.js';

interface WishlistRepository {
  create(input: Partial<WishlistItem>): WishlistItem;
  save(entity: WishlistItem): Promise<WishlistItem>;
  findOneBy(where: Partial<WishlistItem>): Promise<WishlistItem | null>;
  findAndCount(options: {
    readonly where?: Partial<WishlistItem>;
    readonly skip?: number;
    readonly take?: number;
  }): Promise<[WishlistItem[], number]>;
  count(options?: { readonly where?: Partial<WishlistItem> }): Promise<number>;
  remove(entity: WishlistItem): Promise<WishlistItem>;
}

type ProductLike = NonNullable<Awaited<ReturnType<ProductService['findOne']>>>;

export interface WishlistProductSummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly priceMin: number;
  readonly priceMax: number;
  readonly currencyCode: string;
  readonly heroImageUrl: string | null;
  readonly heroTransparentUrl: string | null;
  readonly creatorName: string;
  readonly tags: readonly string[];
  readonly categorySlug: string | null;
}

export interface WishlistListItem {
  readonly id: string;
  readonly customerId: string;
  readonly productId: string;
  readonly addedAt: Date;
  readonly notifyOnPriceDrop: boolean;
  readonly product: WishlistProductSummary;
}

export interface WishlistPageOptions {
  readonly page: number;
  readonly limit: number;
}

export interface WishlistPage {
  readonly items: readonly WishlistListItem[];
  readonly totalItems: number;
  readonly page: number;
  readonly limit: number;
}

const tracer = trace.getTracer('simket-wishlist');
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

@Injectable()
export class WishlistService {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly productService: ProductService,
  ) {}

  async addToWishlist(
    customerId: string,
    productId: string,
    notifyOnPriceDrop = false,
    ctx?: RequestContext,
  ): Promise<WishlistItem> {
    return tracer.startActiveSpan('wishlist.add', async (span) => {
      try {
        const normalizedCustomerId = normalizeEntityId(customerId, 'customerId');
        const normalizedProductId = normalizeEntityId(productId, 'productId');
        span.setAttribute('wishlist.customer_id', normalizedCustomerId);
        span.setAttribute('wishlist.product_id', normalizedProductId);
        span.setAttribute('wishlist.notify_on_price_drop', notifyOnPriceDrop);

        await this.requireProduct(ctx, normalizedProductId);
        const repository = this.getRepository(ctx);
        const existing = await this.runDbSpan(
          'wishlist.db.findExisting',
          () => repository.findOneBy({ customerId: normalizedCustomerId, productId: normalizedProductId }),
          {
            'wishlist.customer_id': normalizedCustomerId,
            'wishlist.product_id': normalizedProductId,
          },
        );

        if (existing) {
          if (existing.notifyOnPriceDrop !== notifyOnPriceDrop) {
            existing.notifyOnPriceDrop = notifyOnPriceDrop;
            return await this.runDbSpan(
              'wishlist.db.saveExisting',
              () => repository.save(existing),
              {
                'wishlist.customer_id': normalizedCustomerId,
                'wishlist.product_id': normalizedProductId,
              },
            );
          }

          return existing;
        }

        return await this.runDbSpan(
          'wishlist.db.save',
          () => repository.save(repository.create({
            customerId: normalizedCustomerId,
            productId: normalizedProductId,
            addedAt: new Date(),
            notifyOnPriceDrop,
          })),
          {
            'wishlist.customer_id': normalizedCustomerId,
            'wishlist.product_id': normalizedProductId,
          },
        );
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async removeFromWishlist(
    customerId: string,
    productId: string,
    ctx?: RequestContext,
  ): Promise<boolean> {
    return tracer.startActiveSpan('wishlist.remove', async (span) => {
      try {
        const normalizedCustomerId = normalizeEntityId(customerId, 'customerId');
        const normalizedProductId = normalizeEntityId(productId, 'productId');
        span.setAttribute('wishlist.customer_id', normalizedCustomerId);
        span.setAttribute('wishlist.product_id', normalizedProductId);

        const repository = this.getRepository(ctx);
        const existing = await this.runDbSpan(
          'wishlist.db.findForRemove',
          () => repository.findOneBy({ customerId: normalizedCustomerId, productId: normalizedProductId }),
          {
            'wishlist.customer_id': normalizedCustomerId,
            'wishlist.product_id': normalizedProductId,
          },
        );

        if (!existing) {
          return false;
        }

        await this.runDbSpan(
          'wishlist.db.remove',
          () => repository.remove(existing),
          {
            'wishlist.customer_id': normalizedCustomerId,
            'wishlist.product_id': normalizedProductId,
          },
        );

        return true;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getWishlist(
    customerId: string,
    options: Partial<WishlistPageOptions> = {},
    ctx?: RequestContext,
  ): Promise<WishlistPage> {
    return tracer.startActiveSpan('wishlist.list', async (span) => {
      try {
        const normalizedCustomerId = normalizeEntityId(customerId, 'customerId');
        const page = normalizePage(options.page);
        const limit = normalizeLimit(options.limit);
        const skip = (page - 1) * limit;
        span.setAttribute('wishlist.customer_id', normalizedCustomerId);
        span.setAttribute('wishlist.page', page);
        span.setAttribute('wishlist.limit', limit);

        const [rows, totalItems] = await this.runDbSpan(
          'wishlist.db.findPage',
          () => this.getRepository(ctx).findAndCount({
            where: { customerId: normalizedCustomerId },
            skip,
            take: limit,
          }),
          {
            'wishlist.customer_id': normalizedCustomerId,
            'wishlist.page': page,
            'wishlist.limit': limit,
          },
        );

        if (rows.length === 0) {
          return { items: [], totalItems, page, limit };
        }

        const products = await this.runDbSpan(
          'wishlist.db.loadProducts',
          () => this.productService.findByIds(ctx as RequestContext, rows.map((row) => row.productId)),
          {
            'wishlist.customer_id': normalizedCustomerId,
            'wishlist.product_count': rows.length,
          },
        );
        const productMap = new Map(
          (products ?? [])
            .filter((product): product is ProductLike => Boolean(product))
            .map((product) => [String(product.id), mapProductSummary(product)]),
        );

        return {
          items: rows.map((row) => {
            const product = productMap.get(String(row.productId));
            if (!product) {
              throw new Error(`Wishlist product "${row.productId}" could not be hydrated.`);
            }

            return {
              id: String(row.id),
              customerId: String(row.customerId),
              productId: String(row.productId),
              addedAt: row.addedAt,
              notifyOnPriceDrop: row.notifyOnPriceDrop,
              product,
            } satisfies WishlistListItem;
          }),
          totalItems,
          page,
          limit,
        };
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async isInWishlist(
    customerId: string,
    productId: string,
    ctx?: RequestContext,
  ): Promise<boolean> {
    return tracer.startActiveSpan('wishlist.contains', async (span) => {
      try {
        const normalizedCustomerId = normalizeEntityId(customerId, 'customerId');
        const normalizedProductId = normalizeEntityId(productId, 'productId');
        span.setAttribute('wishlist.customer_id', normalizedCustomerId);
        span.setAttribute('wishlist.product_id', normalizedProductId);

        const existing = await this.runDbSpan(
          'wishlist.db.findMembership',
          () => this.getRepository(ctx).findOneBy({
            customerId: normalizedCustomerId,
            productId: normalizedProductId,
          }),
          {
            'wishlist.customer_id': normalizedCustomerId,
            'wishlist.product_id': normalizedProductId,
          },
        );
        return Boolean(existing);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getWishlistCount(customerId: string, ctx?: RequestContext): Promise<number> {
    return tracer.startActiveSpan('wishlist.count', async (span) => {
      try {
        const normalizedCustomerId = normalizeEntityId(customerId, 'customerId');
        span.setAttribute('wishlist.customer_id', normalizedCustomerId);

        return await this.runDbSpan(
          'wishlist.db.count',
          () => this.getRepository(ctx).count({ where: { customerId: normalizedCustomerId } }),
          { 'wishlist.customer_id': normalizedCustomerId },
        );
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private getRepository(ctx?: RequestContext): WishlistRepository {
    return this.connection.getRepository(ctx, WishlistItem) as unknown as WishlistRepository;
  }

  private async requireProduct(ctx: RequestContext | undefined, productId: string): Promise<void> {
    const product = await this.runDbSpan(
      'wishlist.db.requireProduct',
      () => this.productService.findOne(ctx as RequestContext, productId),
      { 'wishlist.product_id': productId },
    );

    if (!product) {
      throw new Error(`Product "${productId}" does not exist.`);
    }
  }

  private async runDbSpan<T>(
    name: string,
    work: () => Promise<T>,
    attributes: Record<string, string | number | boolean>,
  ): Promise<T> {
    return tracer.startActiveSpan(name, async (span) => {
      try {
        for (const [key, value] of Object.entries(attributes)) {
          span.setAttribute(key, value);
        }
        return await work();
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

function normalizeEntityId(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`Wishlist ${fieldName} is required.`);
  }

  return normalized;
}

function normalizePage(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_PAGE;
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Wishlist page must be a positive integer.');
  }

  return value;
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_LIMIT;
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Wishlist limit must be a positive integer.');
  }

  return Math.min(value, MAX_LIMIT);
}

function mapProductSummary(product: ProductLike): WishlistProductSummary {
  const rawProduct = product as unknown as Record<string, unknown>;
  const variants = Array.isArray(rawProduct['variants'])
    ? (rawProduct['variants'] as Array<Record<string, unknown>>)
    : [];
  const prices = variants
    .map((variant) => Number(variant['price']))
    .filter((price) => Number.isFinite(price));
  const customFields = isRecord(rawProduct['customFields'])
    ? (rawProduct['customFields'] as Record<string, unknown>)
    : {};
  const featuredAsset = isRecord(rawProduct['featuredAsset'])
    ? (rawProduct['featuredAsset'] as Record<string, unknown>)
    : null;
  const facetValues = Array.isArray(rawProduct['facetValues'])
    ? (rawProduct['facetValues'] as Array<Record<string, unknown>>)
    : [];

  return {
    id: String(product.id),
    slug: readString(rawProduct, 'slug') ?? '',
    name: readString(rawProduct, 'name') ?? '',
    description: readString(rawProduct, 'description') ?? '',
    priceMin: prices.length > 0 ? Math.min(...prices) : 0,
    priceMax: prices.length > 0 ? Math.max(...prices) : 0,
    currencyCode:
      typeof variants[0]?.['currencyCode'] === 'string' ? String(variants[0]['currencyCode']) : 'USD',
    heroImageUrl: featuredAsset ? readString(featuredAsset, 'preview') ?? null : null,
    heroTransparentUrl: readString(customFields, 'heroTransparentUrl') ?? null,
    creatorName:
      readString(customFields, 'creatorName')
      ?? readString(customFields, 'creatorDisplayName')
      ?? '',
    tags: facetValues
      .map((facetValue) => readString(facetValue, 'name'))
      .filter((tag): tag is string => Boolean(tag)),
    categorySlug: readString(customFields, 'categorySlug') ?? null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: unknown, key: string): string | undefined {
  return isRecord(record) && typeof record[key] === 'string' ? String(record[key]) : undefined;
}
