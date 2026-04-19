/**
 * Purpose: Platform fee calculation, persistence, and recommendation boost lookups.
 *
 * The platform takes a configurable percentage (min 5%) of each sale. Higher take
 * rates give products a proportional boost in the recommendation pipeline. This
 * module keeps pure calculation helpers for reuse and also exposes a Vendure-aware
 * service for GraphQL resolvers.
 *
 * Governing docs:
 *   - docs/architecture.md §2 (checkout reads skip cache), §5 service ownership
 *   - docs/service-architecture.md §1.1 (Vendure gateway), §1.13 (Payment API contract)
 *   - docs/domain-model.md §4.1 (Product.platformTakeRate)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/connection/transactional-connection.d.ts
 *   - packages/vendure-server/node_modules/@vendure/core/dist/entity/product/product.entity.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/platform-fee/platform-fee.service.test.ts
 *   - packages/vendure-server/src/plugins/platform-fee/platform-fee.resolver.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { Product, type RequestContext, type TransactionalConnection } from '@vendure/core';

/** Minimum platform take rate: 5%. */
export const MIN_TAKE_RATE = 5;

/** Maximum platform take rate: 100%. */
export const MAX_TAKE_RATE = 100;

/**
 * Minimum price in cents for paid products.
 * Free products (0 cents) are allowed. This prevents micro-pricing that doesn't
 * cover per-transaction costs (e.g., 30-cent card network fees).
 */
export const MIN_PRICE_CENTS = 100; // $1.00

export interface PlatformFeeSummary {
  readonly productId: string;
  readonly feePercent: number;
  readonly defaultFeePercent: number;
  readonly minimumFeePercent: number;
  readonly maximumFeePercent: number;
  readonly recommendationBoost: number;
}

export interface PlatformFeeDefaults {
  readonly defaultFeePercent: number;
  readonly minimumFeePercent: number;
  readonly maximumFeePercent: number;
}

const tracer = trace.getTracer('simket-platform-fee');

@Injectable()
export class PlatformFeeService {
  constructor(
    private readonly connection: Pick<TransactionalConnection, 'findOneInChannel' | 'getRepository'>,
  ) {}

  getDefaults(): PlatformFeeDefaults {
    return {
      defaultFeePercent: MIN_TAKE_RATE,
      minimumFeePercent: MIN_TAKE_RATE,
      maximumFeePercent: MAX_TAKE_RATE,
    };
  }

  async getPlatformFee(ctx: RequestContext, productId: string): Promise<PlatformFeeSummary> {
    return tracer.startActiveSpan('platformFee.get', async (span) => {
      try {
        const product = await this.requireProduct(this.createMasterContext(ctx), productId);
        const feePercent = readProductTakeRate(product);

        return this.toSummary(productId, feePercent);
      } catch (error) {
        recordSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async setPlatformFee(
    ctx: RequestContext,
    productId: string,
    feePercent: number,
  ): Promise<PlatformFeeSummary> {
    return tracer.startActiveSpan('platformFee.set', async (span) => {
      try {
        if (!Number.isInteger(feePercent)) {
          throw new RangeError('Platform fee percent must be an integer.');
        }
        validateFeeConfiguration({ takeRate: feePercent, priceCents: MIN_PRICE_CENTS });
        const masterCtx = this.createMasterContext(ctx);
        const product = await this.requireProduct(masterCtx, productId);
        const validation = validateFeeConfiguration({
          takeRate: feePercent,
          priceCents: MIN_PRICE_CENTS,
        });
        if (!validation.valid) {
          throw new RangeError(validation.errors.join(' '));
        }

        product.customFields = {
          ...(toRecord(product.customFields) ?? {}),
          platformTakeRate: feePercent,
        };
        await this.connection.getRepository(masterCtx, Product, { replicationMode: 'master' }).save(product);

        return this.toSummary(productId, feePercent);
      } catch (error) {
        recordSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async requireProduct(ctx: RequestContext, productId: string): Promise<Product> {
    const normalizedProductId = normalizeProductId(productId);
    const product = await this.connection.findOneInChannel(ctx, Product, normalizedProductId, ctx.channelId);
    if (!product) {
      throw new Error(`Product "${normalizedProductId}" was not found in the active channel.`);
    }

    return product;
  }

  private toSummary(productId: string, feePercent: number): PlatformFeeSummary {
    return {
      productId: normalizeProductId(productId),
      feePercent,
      ...this.getDefaults(),
      recommendationBoost: getRecommendationBoost(feePercent),
    };
  }

  private createMasterContext(ctx: RequestContext): RequestContext {
    const masterCtx = ctx.copy();
    masterCtx.setReplicationMode('master');
    return masterCtx;
  }
}

/**
 * Calculate the platform fee in cents for a sale.
 *
 * Uses ceiling rounding so the platform always receives at least the correct
 * proportion (never under-charges due to rounding).
 *
 * @param priceCents - Product price in cents (must be positive integer)
 * @param takeRate - Platform take rate as a percentage (5–100)
 * @returns Fee in cents (always integer, rounded up)
 */
export function calculatePlatformFee(
  priceCents: number,
  takeRate: number,
): number {
  if (!Number.isInteger(priceCents) || priceCents <= 0) {
    throw new RangeError('Price must be a positive integer (cents)');
  }
  if (takeRate < MIN_TAKE_RATE || takeRate > MAX_TAKE_RATE) {
    throw new RangeError(
      `Take rate must be between ${MIN_TAKE_RATE}% and ${MAX_TAKE_RATE}%`,
    );
  }
  return Math.ceil(priceCents * (takeRate / 100));
}

/**
 * Calculate creator revenue after platform fee.
 *
 * Invariant: `calculatePlatformFee(p, r) + calculateCreatorRevenue(p, r) === p`
 *
 * @param priceCents - Product price in cents
 * @param takeRate - Platform take rate (5–100)
 * @returns Creator's share in cents
 */
export function calculateCreatorRevenue(
  priceCents: number,
  takeRate: number,
): number {
  return priceCents - calculatePlatformFee(priceCents, takeRate);
}

/**
 * Compute the recommendation boost multiplier based on take rate.
 *
 * Formula: `boost = 1.0 + (takeRate - MIN_TAKE_RATE) × 0.1`
 *
 * At 5%  → 1.0× (no boost — baseline)
 * At 10% → 1.5×
 * At 15% → 2.0×
 * At 100% → 10.5×
 *
 * This multiplier is applied in the recommendation pipeline's TakeRateBoostRanker.
 *
 * @param takeRate - Platform take rate (5–100)
 * @returns Boost multiplier (≥ 1.0)
 */
export function getRecommendationBoost(takeRate: number): number {
  if (takeRate < MIN_TAKE_RATE || takeRate > MAX_TAKE_RATE) {
    throw new RangeError(
      `Take rate must be between ${MIN_TAKE_RATE}% and ${MAX_TAKE_RATE}%`,
    );
  }
  return 1.0 + (takeRate - MIN_TAKE_RATE) * 0.1;
}

/**
 * Validation result for fee configuration.
 */
export interface FeeValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate a fee configuration before applying it.
 *
 * Rules:
 * - Take rate must be integer in [MIN_TAKE_RATE, MAX_TAKE_RATE]
 * - Price must be 0 (free) or ≥ MIN_PRICE_CENTS
 */
export function validateFeeConfiguration(config: {
  takeRate: number;
  priceCents: number;
}): FeeValidationResult {
  const errors: string[] = [];

  if (!Number.isFinite(config.takeRate) || !Number.isInteger(config.takeRate)) {
    errors.push('Take rate must be an integer');
  } else {
    if (config.takeRate < MIN_TAKE_RATE) {
      errors.push(`Take rate must be at least ${MIN_TAKE_RATE}%`);
    }
    if (config.takeRate > MAX_TAKE_RATE) {
      errors.push(`Take rate must be at most ${MAX_TAKE_RATE}%`);
    }
  }

  if (config.priceCents !== 0 && config.priceCents < MIN_PRICE_CENTS) {
    errors.push(
      `Price must be at least ${MIN_PRICE_CENTS} cents ($${(MIN_PRICE_CENTS / 100).toFixed(2)})`,
    );
  }

  return { valid: errors.length === 0, errors };
}

function readProductTakeRate(product: Product): number {
  const customFields = toRecord(product.customFields);
  const takeRate = Number(customFields?.['platformTakeRate'] ?? MIN_TAKE_RATE);
  return Number.isFinite(takeRate) ? takeRate : MIN_TAKE_RATE;
}

function normalizeProductId(productId: string): string {
  const normalized = productId.trim();
  if (normalized.length === 0) {
    throw new Error('Product ID is required.');
  }
  return normalized;
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function recordSpanError(span: { recordException(error: unknown): void; setStatus(status: { code: SpanStatusCode; message?: string }): void }, error: unknown): void {
  if (error instanceof Error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  }
}
