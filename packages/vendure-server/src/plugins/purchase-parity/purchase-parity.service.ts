/**
 * Purpose: Purchase parity (regional pricing) — discount resolution, persistence, and application.
 *
 * Provides pure functions for resolving regional discounts by country code,
 * applying discounts to prices, and validating pricing rules. This logic is
 * I/O-free so it can be used in both the Vendure plugin and at checkout.
 * The same module also exposes a Vendure-aware service for resolver-backed CRUD.
 *
 * Governing docs:
 *   - docs/architecture.md §5 service ownership
 *   - docs/service-architecture.md §1.1 (Vendure gateway)
 *   - docs/domain-model.md §4.1 (Product pricing)
 * External references:
 *   - https://docs.vendure.io/guides/core-concepts/channels/
 *   - ISO 3166-1 alpha-2 country codes
 * Tests:
 *   - packages/vendure-server/src/plugins/purchase-parity/purchase-parity.service.test.ts
 *   - packages/vendure-server/src/plugins/purchase-parity/purchase-parity.resolver.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  Product,
  ProductPriceApplicator,
  ProductVariant,
  TransactionalConnection,
  type RequestContext,
} from '@vendure/core';
import { resolveRegion, isRegionGroup } from './regions.js';
import { COUNTRY_TO_REGION, REGION_GROUPS, type RegionGroup } from './regions.js';

/** Maximum allowed regional discount percentage. */
export const MAX_DISCOUNT_PERCENT = 80;

/**
 * A single regional pricing rule — either for a specific country code
 * (e.g., "BR") or a region group (e.g., "LATAM").
 */
export interface RegionalPricingRule {
  /** ISO 3166-1 alpha-2 country code OR a RegionGroup name. */
  readonly region: string;
  /** Discount percentage (0–MAX_DISCOUNT_PERCENT, integer). */
  readonly discountPercent: number;
}

export interface RegionalPricingRecord {
  readonly productId: string;
  readonly rules: readonly RegionalPricingRule[];
}

export interface PurchaseParityRegionDescriptor {
  readonly code: string;
  readonly type: 'GROUP' | 'COUNTRY';
  readonly parentRegion: string | null;
  readonly countries: readonly string[];
}

export interface LocalizedPriceResult {
  readonly productId: string;
  readonly countryCode: string | null;
  readonly region: string | null;
  readonly currencyCode: string;
  readonly basePriceCents: number;
  readonly discountPercent: number;
  readonly localizedPriceCents: number;
}

const tracer = trace.getTracer('simket-purchase-parity');

@Injectable()
export class PurchaseParityService {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly productPriceApplicator: ProductPriceApplicator,
  ) {}

  async setRegionalPricing(
    ctx: RequestContext,
    productId: string,
    rules: readonly RegionalPricingRule[],
  ): Promise<RegionalPricingRecord> {
    return tracer.startActiveSpan('purchaseParity.setRules', async (span) => {
      try {
        const normalizedRules = normalizeRegionalPricingRules(rules);
        const masterCtx = this.createMasterContext(ctx);
        const product = await this.requireProduct(masterCtx, productId);
        product.customFields = {
          ...(toRecord(product.customFields) ?? {}),
          regionalPricingRules: normalizedRules,
        };
        await this.connection.getRepository(masterCtx, Product, { replicationMode: 'master' }).save(product);

        return {
          productId: normalizeProductId(productId),
          rules: normalizedRules,
        };
      } catch (error) {
        recordSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getRegionalPricing(ctx: RequestContext, productId: string): Promise<RegionalPricingRecord> {
    return tracer.startActiveSpan('purchaseParity.getRules', async (span) => {
      try {
        const product = await this.requireProduct(this.createMasterContext(ctx), productId);
        return {
          productId: normalizeProductId(productId),
          rules: readRegionalPricingRules(product),
        };
      } catch (error) {
        recordSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  listRegions(): PurchaseParityRegionDescriptor[] {
    const groupedCountries = REGION_GROUPS.map((group) => ({
      code: group,
      type: 'GROUP' as const,
      parentRegion: null,
      countries: Object.entries(COUNTRY_TO_REGION)
        .filter(([, region]) => region === group)
        .map(([countryCode]) => countryCode)
        .sort(),
    }));

    const countries = Object.entries(COUNTRY_TO_REGION)
      .map(([countryCode, region]) => ({
        code: countryCode,
        type: 'COUNTRY' as const,
        parentRegion: region,
        countries: [] as string[],
      }))
      .sort((left, right) => left.code.localeCompare(right.code));

    return [...groupedCountries, ...countries];
  }

  async localizedPrice(ctx: RequestContext, productId: string): Promise<LocalizedPriceResult> {
    return tracer.startActiveSpan('purchaseParity.localizedPrice', async (span) => {
      try {
        const masterCtx = this.createMasterContext(ctx);
        const repository = this.connection.getRepository(masterCtx, ProductVariant, { replicationMode: 'master' });
        const variant = await repository.findOne({
          where: {
            productId: normalizeProductId(productId),
            enabled: true,
          } as never,
          relations: {
            product: true,
            taxCategory: true,
          } as never,
          order: {
            id: 'ASC',
          } as never,
        });

        if (!variant || !variant.product) {
          throw new Error(`Product "${normalizeProductId(productId)}" does not have a saleable variant in the active channel.`);
        }

        const pricedVariant = await this.productPriceApplicator.applyChannelPriceAndTax(
          variant,
          masterCtx,
          undefined,
          true,
        );
        const countryCode = readBuyerCountryCode(ctx) ?? null;
        const rules = readRegionalPricingRules(pricedVariant.product as Product);
        const discountPercent = countryCode ? resolveRegionalDiscount(rules, countryCode) : 0;

        return {
          productId: normalizeProductId(productId),
          countryCode,
          region: countryCode ? resolveRegion(countryCode) ?? null : null,
          currencyCode: pricedVariant.currencyCode,
          basePriceCents: pricedVariant.price,
          discountPercent,
          localizedPriceCents: applyRegionalDiscount(pricedVariant.price, discountPercent),
        };
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

  private createMasterContext(ctx: RequestContext): RequestContext {
    const masterCtx = ctx.copy();
    masterCtx.setReplicationMode('master');
    return masterCtx;
  }
}

/**
 * Resolve the applicable regional discount for a buyer's country.
 *
 * Resolution order:
 * 1. Exact country code match in rules (e.g., "BR" rule for a Brazilian buyer)
 * 2. Region group match (e.g., "LATAM" rule for a Brazilian buyer)
 * 3. No match → 0% discount
 *
 * @param rules - All regional pricing rules for a product
 * @param countryCode - Buyer's ISO 3166-1 alpha-2 country code
 * @returns Discount percentage to apply (0 if no match)
 */
export function resolveRegionalDiscount(
  rules: readonly RegionalPricingRule[],
  countryCode: string,
): number {
  const normalizedCode = countryCode.toUpperCase();

  // 1. Check for exact country code match
  const countryRule = rules.find(
    (r) => r.region.toUpperCase() === normalizedCode && !isRegionGroup(r.region),
  );
  if (countryRule) {
    return countryRule.discountPercent;
  }

  // 2. Check for region group match
  const region: RegionGroup | undefined = resolveRegion(normalizedCode);
  if (region) {
    const regionRule = rules.find((r) => r.region === region);
    if (regionRule) {
      return regionRule.discountPercent;
    }
  }

  // 3. No match
  return 0;
}

/**
 * Apply a regional discount to a price in cents.
 *
 * Uses floor rounding to favor the buyer (they pay less, not more).
 *
 * @param priceCents - Original price in cents
 * @param discountPercent - Discount percentage (0–MAX_DISCOUNT_PERCENT)
 * @returns Discounted price in cents (never negative)
 */
export function applyRegionalDiscount(
  priceCents: number,
  discountPercent: number,
): number {
  if (discountPercent <= 0) return priceCents;
  if (discountPercent >= 100) return 0;
  return Math.floor(priceCents * (1 - discountPercent / 100));
}

/**
 * Validation result for a regional pricing rule.
 */
export interface RegionalPricingValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate a regional pricing rule before persisting.
 */
export function validateRegionalPricing(rule: {
  region: string;
  discountPercent: number;
}): RegionalPricingValidationResult {
  const errors: string[] = [];

  if (!rule.region || rule.region.trim().length === 0) {
    errors.push('Region must not be empty');
  }

  if (!Number.isFinite(rule.discountPercent) || !Number.isInteger(rule.discountPercent)) {
    errors.push('Discount percentage must be a finite integer');
  } else {
    if (rule.discountPercent < 0) {
      errors.push('Discount percentage must be at least 0');
    }
    if (rule.discountPercent > MAX_DISCOUNT_PERCENT) {
      errors.push(
        `Discount percentage must be at most ${MAX_DISCOUNT_PERCENT}%`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

function normalizeRegionalPricingRules(
  rules: readonly RegionalPricingRule[],
): RegionalPricingRule[] {
  const seenRegions = new Set<string>();

  return rules.map((rule) => {
    const normalizedRule = {
      region: rule.region.trim().toUpperCase(),
      discountPercent: rule.discountPercent,
    };
    const validation = validateRegionalPricing(normalizedRule);
    if (!validation.valid) {
      throw new Error(validation.errors.join(' '));
    }
    if (seenRegions.has(normalizedRule.region)) {
      throw new Error(`Duplicate regional pricing rule for "${normalizedRule.region}".`);
    }
    seenRegions.add(normalizedRule.region);
    return normalizedRule;
  });
}

function normalizeProductId(productId: string): string {
  const normalized = productId.trim();
  if (normalized.length === 0) {
    throw new Error('Product ID is required.');
  }
  return normalized;
}

function readRegionalPricingRules(product: Product): RegionalPricingRule[] {
  const customFields = toRecord(product.customFields);
  const rawRules = Array.isArray(customFields?.['regionalPricingRules'])
    ? (customFields?.['regionalPricingRules'] as unknown[])
    : [];

  return rawRules.flatMap((rule) => {
    const record = toRecord(rule);
    if (!record) {
      return [];
    }

    const region = typeof record['region'] === 'string' ? record['region'].trim().toUpperCase() : '';
    const discountPercent = Number(record['discountPercent']);
    if (region.length === 0 || !Number.isFinite(discountPercent)) {
      return [];
    }

    return [{ region, discountPercent }];
  });
}

function readBuyerCountryCode(ctx: RequestContext): string | undefined {
  const headers = ctx.req?.headers;
  if (!headers) {
    return undefined;
  }

  const candidate =
    headerValue(headers['cf-ipcountry'])
    ?? headerValue(headers['x-country-code'])
    ?? headerValue(headers['x-buyer-country-code']);
  const normalized = candidate?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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
