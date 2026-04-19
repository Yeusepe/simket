/**
 * Purpose: Persist bundle definitions and expose bundle pricing helpers to GraphQL resolvers.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/domain-model.md (§4.2 Bundle)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/service/services/product.service.d.ts
 *   - packages/vendure-server/node_modules/typeorm/repository/Repository.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/bundle/bundle.plugin.test.ts
 *   - packages/vendure-server/src/plugins/bundle/bundle.resolver.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { ProductService, type RequestContext, type TransactionalConnection } from '@vendure/core';
import type { Product } from '@vendure/core';
import { BundleEntity } from './bundle.entity.js';

const tracer = trace.getTracer('simket-bundle');

export const MIN_DISCOUNT = 0;
export const MAX_DISCOUNT = 100;

export interface BundleLinePricingInput {
  readonly productId: string;
  readonly variantId: string;
  readonly price: number;
}

export interface BundleLinePricing extends BundleLinePricingInput {
  readonly originalPrice: number;
  readonly discountedPrice: number;
  readonly discountAmount: number;
}

export interface BundleCartPricing {
  readonly originalSubtotal: number;
  readonly discountedSubtotal: number;
  readonly discountTotal: number;
  readonly lines: readonly BundleLinePricing[];
}

export interface BundleRecord {
  readonly id: string;
  readonly name: string;
  readonly productIds: readonly string[];
  readonly discountPercent: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateBundleInput {
  readonly name: string;
  readonly productIds: readonly string[];
  readonly discountPercent: number;
}

export interface UpdateBundleInput {
  readonly name?: string;
  readonly productIds?: readonly string[];
  readonly discountPercent?: number;
}

interface BundleRepository {
  create(input: Partial<BundleEntity>): BundleEntity;
  save(entity: BundleEntity): Promise<BundleEntity>;
  find(options?: {
    readonly relations?: {
      readonly products?: boolean;
    };
    readonly order?: {
      readonly createdAt?: 'ASC' | 'DESC';
    };
  }): Promise<BundleEntity[]>;
  findOne(options: {
    readonly where: Partial<BundleEntity>;
    readonly relations?: {
      readonly products?: boolean;
    };
  }): Promise<BundleEntity | null>;
  delete(criteria: string): Promise<{ affected?: number | null }>;
}

/**
 * Validates that a discount percentage is a finite number in the [0, 100] range.
 * Returns an error string if invalid, or undefined if valid.
 */
export function validateDiscountPercent(value: number): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'discountPercent must be a finite number';
  }
  if (value < MIN_DISCOUNT) {
    return `discountPercent must be at least ${MIN_DISCOUNT}%`;
  }
  if (value > MAX_DISCOUNT) {
    return `discountPercent must be at most ${MAX_DISCOUNT}%`;
  }
  return undefined;
}

/**
 * Calculates the total bundle price after applying a discount.
 * @param prices - Array of individual product prices (in minor units, e.g. cents).
 * @param discountPercent - Discount percentage to apply (0–100).
 * @returns The discounted total, rounded to the nearest integer.
 */
export function calculateBundlePrice(prices: readonly number[], discountPercent: number): number {
  const total = prices.reduce((sum, price) => sum + price, 0);
  const discounted = total * (1 - discountPercent / 100);
  return Math.round(discounted);
}

/**
 * Allocates bundle-discounted prices to each line while preserving the exact
 * discounted subtotal in integer minor units.
 */
export function allocateBundleLinePricing(
  lines: readonly BundleLinePricingInput[],
  discountPercent: number,
): BundleCartPricing {
  const originalSubtotal = lines.reduce((sum, line) => sum + line.price, 0);
  const discountedSubtotal = calculateBundlePrice(
    lines.map((line) => line.price),
    discountPercent,
  );
  let runningDiscountedSubtotal = 0;

  const pricedLines = lines.map((line, index) => {
    const discountedPrice = index === lines.length - 1
      ? discountedSubtotal - runningDiscountedSubtotal
      : Math.round(line.price * (1 - discountPercent / 100));

    runningDiscountedSubtotal += discountedPrice;

    return {
      ...line,
      originalPrice: line.price,
      discountedPrice,
      discountAmount: line.price - discountedPrice,
    } satisfies BundleLinePricing;
  });

  return {
    originalSubtotal,
    discountedSubtotal,
    discountTotal: originalSubtotal - discountedSubtotal,
    lines: pricedLines,
  };
}

@Injectable()
export class BundleService {
  constructor(
    private readonly connection: Pick<TransactionalConnection, 'getRepository'>,
    private readonly productService: ProductService,
  ) {}

  async createBundle(input: CreateBundleInput, ctx: RequestContext): Promise<BundleRecord> {
    return tracer.startActiveSpan('bundle.create', async (span) => {
      try {
        const name = normalizeBundleName(input.name);
        const productIds = normalizeProductIds(input.productIds);
        assertValidDiscount(input.discountPercent);
        const products = await this.requireProducts(ctx, productIds);

        const saved = await this.getRepository(ctx).save(
          this.getRepository(ctx).create({
            name,
            discountPercent: input.discountPercent,
            products,
          }),
        );

        span.setAttribute('bundle.product_count', productIds.length);
        return mapBundle(saved);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async updateBundle(id: string, input: UpdateBundleInput, ctx: RequestContext): Promise<BundleRecord> {
    return tracer.startActiveSpan('bundle.update', async (span) => {
      try {
        const normalizedId = normalizeEntityId(id, 'bundleId');
        const bundle = await this.requireBundle(normalizedId, ctx);

        if (input.name !== undefined) {
          bundle.name = normalizeBundleName(input.name);
        }
        if (input.discountPercent !== undefined) {
          assertValidDiscount(input.discountPercent);
          bundle.discountPercent = input.discountPercent;
        }
        if (input.productIds !== undefined) {
          const productIds = normalizeProductIds(input.productIds);
          bundle.products = await this.requireProducts(ctx, productIds);
          span.setAttribute('bundle.product_count', productIds.length);
        }

        return mapBundle(await this.getRepository(ctx).save(bundle));
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async deleteBundle(id: string, ctx: RequestContext): Promise<boolean> {
    return tracer.startActiveSpan('bundle.delete', async (span) => {
      try {
        const normalizedId = normalizeEntityId(id, 'bundleId');
        const result = await this.getRepository(ctx).delete(normalizedId);
        return (result.affected ?? 0) > 0;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getBundle(id: string, ctx: RequestContext, includeDisabled = true): Promise<BundleRecord | null> {
    const normalizedId = normalizeEntityId(id, 'bundleId');
    const bundle = await this.getRepository(ctx).findOne({
      where: { id: normalizedId },
      relations: { products: true },
    });

    if (!bundle || (!includeDisabled && bundle.enabled === false)) {
      return null;
    }

    return mapBundle(bundle);
  }

  async listBundles(ctx: RequestContext, includeDisabled = true): Promise<BundleRecord[]> {
    const bundles = await this.getRepository(ctx).find({
      relations: { products: true },
      order: { createdAt: 'DESC' },
    });

    return bundles
      .filter((bundle) => includeDisabled || bundle.enabled !== false)
      .map((bundle) => mapBundle(bundle));
  }

  async listBundlesForProduct(productId: string, ctx: RequestContext): Promise<BundleRecord[]> {
    const normalizedProductId = normalizeEntityId(productId, 'productId');
    const bundles = await this.listBundles(ctx, false);
    return bundles.filter((bundle) => bundle.productIds.includes(normalizedProductId));
  }

  calculatePricing(lines: readonly BundleLinePricingInput[], discountPercent: number): BundleCartPricing {
    assertValidDiscount(discountPercent);
    return allocateBundleLinePricing(lines, discountPercent);
  }

  private getRepository(ctx: RequestContext): BundleRepository {
    return this.connection.getRepository(ctx, BundleEntity) as unknown as BundleRepository;
  }

  private async requireBundle(id: string, ctx: RequestContext): Promise<BundleEntity> {
    const bundle = await this.getRepository(ctx).findOne({
      where: { id },
      relations: { products: true },
    });
    if (!bundle) {
      throw new Error(`Bundle "${id}" does not exist.`);
    }
    return bundle;
  }

  private async requireProducts(ctx: RequestContext, productIds: readonly string[]): Promise<Product[]> {
    const products = await this.productService.findByIds(ctx, [...productIds]);
    const foundProductIds = new Set(products.map((product) => String(product.id)));
    const missing = productIds.filter((productId) => !foundProductIds.has(productId));

    if (missing.length > 0) {
      throw new Error(`Bundle products not found: ${missing.join(', ')}.`);
    }

    return products as unknown as Product[];
  }
}

function assertValidDiscount(value: number): void {
  const error = validateDiscountPercent(value);
  if (error) {
    throw new Error(error);
  }
}

function normalizeBundleName(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error('Bundle name is required.');
  }
  return normalized;
}

function normalizeEntityId(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`Bundle ${fieldName} is required.`);
  }
  return normalized;
}

function normalizeProductIds(productIds: readonly string[]): string[] {
  if (productIds.length === 0) {
    throw new Error('Bundle productIds must include at least one product.');
  }

  const normalized = productIds.map((productId) => normalizeEntityId(productId, 'productId'));
  return [...new Set(normalized)];
}

function mapBundle(bundle: BundleEntity): BundleRecord {
  return {
    id: String(bundle.id),
    name: bundle.name,
    productIds: bundle.products.map((product) => String(product.id)),
    discountPercent: bundle.discountPercent,
    createdAt: bundle.createdAt,
    updatedAt: bundle.updatedAt,
  };
}
