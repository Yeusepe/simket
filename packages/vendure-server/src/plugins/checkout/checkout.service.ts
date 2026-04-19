/**
 * Purpose: Checkout logic — ties SQL-backed cart items to Hyperswitch payment creation.
 *
 * Pure functions for: cart validation, total calculation (with regional discounts),
 * platform fee computation, and building Hyperswitch-compatible payment params.
 * Also exposes a Vendure-aware service which loads fresh product pricing from SQL.
 *
 * Governing docs:
 *   - docs/architecture.md §2 (checkout reads skip cache), §5 service ownership
 *   - docs/service-architecture.md §1.1 (Vendure gateway), §1.13 (Hyperswitch API contract)
 * External references:
 *   - https://api-reference.hyperswitch.io/#tag/Payments
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/service/helpers/product-price-applicator/product-price-applicator.d.ts
 *   - packages/vendure-server/node_modules/@vendure/core/dist/entity/order/order.entity.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/checkout/checkout.service.test.ts
 *   - packages/vendure-server/src/plugins/checkout/checkout.resolver.test.ts
 */
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  CustomerService,
  Order,
  Product,
  ProductPriceApplicator,
  ProductVariant,
  type RequestContext,
  type TransactionalConnection,
} from '@vendure/core';
import { calculatePlatformFee } from '../platform-fee/platform-fee.service.js';
import {
  applyRegionalDiscount,
  resolveRegionalDiscount,
  type RegionalPricingRule,
} from '../purchase-parity/purchase-parity.service.js';
import type { CreateHyperswitchPaymentParams, HyperswitchOrderDetail } from '../../features/hyperswitch/hyperswitch.types.js';

const MIN_TAKE_RATE = 5;
const tracer = trace.getTracer('simket-checkout');

/** A cart item at checkout time — prices always read fresh from SQL, never cache. */
export interface CheckoutCartItem {
  readonly productId: string;
  readonly title: string;
  /** Price in cents — always from Vendure SQL, never cached. */
  readonly priceCents: number;
  readonly quantity: number;
  /** Platform take rate percentage (min 5%). */
  readonly takeRate: number;
  /** Creator-configured purchase parity discount for the current buyer region. */
  readonly regionalDiscountPercent?: number;
  readonly currencyCode: string;
}

export interface CheckoutTotals {
  readonly subtotalCents: number;
  readonly discountedSubtotalCents: number;
  readonly platformFeeCents: number;
  readonly totalCents: number;
}

export interface CheckoutValidation {
  readonly valid: boolean;
  readonly errors: string[];
}

export interface RequestedCheckoutCartItem {
  readonly productId: string;
  readonly quantity: number;
}

export interface CheckoutValidationResult extends CheckoutValidation {
  readonly items: readonly CheckoutCartItem[];
  readonly totals: CheckoutTotals;
}

export interface CheckoutPaymentPayload {
  readonly amount: number;
  readonly currency: string;
  readonly customerId?: string;
  readonly captureMethod?: 'automatic' | 'manual';
  readonly returnUrl?: string;
  readonly confirm?: boolean;
  readonly merchantOrderReferenceId?: string;
  readonly metadata?: Record<string, string>;
  readonly orderDetails?: readonly HyperswitchOrderDetail[];
}

export interface CheckoutInitiationResult {
  readonly orderId: string;
  readonly totals: CheckoutTotals;
  readonly payment: CheckoutPaymentPayload;
}

export interface CheckoutStatusResult {
  readonly orderId: string;
  readonly code: string;
  readonly state: string;
  readonly active: boolean;
  readonly totalWithTax: number;
  readonly currencyCode: string;
}

/** Typed checkout error with an error code for programmatic handling. */
export class CheckoutError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CheckoutError';
  }
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly connection: Pick<TransactionalConnection, 'getRepository' | 'findOneInChannel'>,
    private readonly customerService: CustomerService,
    private readonly productPriceApplicator: ProductPriceApplicator,
  ) {}

  async validateCart(
    ctx: RequestContext,
    requestedItems: readonly RequestedCheckoutCartItem[],
  ): Promise<CheckoutValidationResult> {
    return tracer.startActiveSpan('checkout.validateCart', async (span) => {
      try {
        const cartItems = await this.loadCartItemsFromSql(ctx, requestedItems);
        const validation = validateCheckoutCart(cartItems);

        return {
          ...validation,
          items: cartItems,
          totals: calculateCheckoutTotals(cartItems),
        };
      } catch (error) {
        if (error instanceof Error) {
          return {
            valid: false,
            errors: [error.message],
            items: [],
            totals: ZERO_TOTALS,
          };
        }
        recordSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async initiateCheckout(
    ctx: RequestContext,
    requestedItems: readonly RequestedCheckoutCartItem[],
    returnUrl: string,
    orderId: string,
  ): Promise<CheckoutInitiationResult> {
    return tracer.startActiveSpan('checkout.initiateCheckout', async (span) => {
      try {
        const normalizedOrderId = normalizeRequiredString(orderId, 'orderId');
        const normalizedReturnUrl = normalizeRequiredString(returnUrl, 'returnUrl');
        const cartItems = await this.loadCartItemsFromSql(ctx, requestedItems);
        const validation = validateCheckoutCart(cartItems);

        if (!validation.valid) {
          throw new CheckoutError('INVALID_CART', validation.errors.join(' '));
        }

        const customerId = await this.requireActiveCustomerId(ctx);
        const payment = buildCheckoutPaymentParams({
          items: cartItems,
          customerId,
          currency: cartItems[0]?.currencyCode ?? ctx.currencyCode,
          returnUrl: normalizedReturnUrl,
          orderId: normalizedOrderId,
        });

        return {
          orderId: normalizedOrderId,
          totals: calculateCheckoutTotals(cartItems),
          payment: {
            ...payment,
            orderDetails: payment.orderDetails ?? [],
          },
        };
      } catch (error) {
        recordSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async getCheckoutStatus(ctx: RequestContext, orderId: string): Promise<CheckoutStatusResult> {
    return tracer.startActiveSpan('checkout.getStatus', async (span) => {
      try {
        const normalizedOrderId = normalizeRequiredString(orderId, 'orderId');
        const customerId = await this.requireActiveCustomerId(ctx);
        const masterCtx = this.createMasterContext(ctx);
        const order = await this.connection.findOneInChannel(masterCtx, Order, normalizedOrderId, masterCtx.channelId);

        if (!order || String(order.customerId ?? '') !== customerId) {
          throw new CheckoutError(
            'ORDER_NOT_FOUND',
            `Order "${normalizedOrderId}" was not found for the active customer.`,
          );
        }

        return {
          orderId: String(order.id),
          code: order.code,
          state: order.state,
          active: order.active,
          totalWithTax: order.totalWithTax,
          currencyCode: order.currencyCode,
        };
      } catch (error) {
        recordSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async loadCartItemsFromSql(
    ctx: RequestContext,
    requestedItems: readonly RequestedCheckoutCartItem[],
  ): Promise<CheckoutCartItem[]> {
    const normalizedItems = normalizeRequestedItems(requestedItems);
    const buyerCountryCode = readBuyerCountryCode(ctx);
    const masterCtx = this.createMasterContext(ctx);
    const repository = this.connection.getRepository(masterCtx, ProductVariant, { replicationMode: 'master' });
    const cartItems: CheckoutCartItem[] = [];

    for (const requestedItem of normalizedItems) {
      const variant = await repository.findOne({
        where: {
          productId: requestedItem.productId,
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
        throw new CheckoutError(
          'PRODUCT_NOT_FOUND',
          `Product "${requestedItem.productId}" does not have a saleable variant in the active channel.`,
        );
      }

      const pricedVariant = await this.productPriceApplicator.applyChannelPriceAndTax(
        variant,
        masterCtx,
        undefined,
        true,
      );
      const product = pricedVariant.product as Product;
      const takeRate = readProductTakeRate(product);
      const rules = readRegionalPricingRules(product);
      const regionalDiscountPercent = buyerCountryCode
        ? resolveRegionalDiscount(rules, buyerCountryCode)
        : 0;

      cartItems.push({
        productId: String(product.id),
        title: product.name,
        priceCents: pricedVariant.price,
        quantity: requestedItem.quantity,
        takeRate,
        regionalDiscountPercent,
        currencyCode: pricedVariant.currencyCode,
      });
    }

    return cartItems;
  }

  private async requireActiveCustomerId(ctx: RequestContext): Promise<string> {
    const activeUserId = ctx.activeUserId;
    if (!activeUserId) {
      throw new CheckoutError('AUTH_REQUIRED', 'Checkout requires an authenticated customer.');
    }
    const customer = await this.customerService.findOneByUserId(ctx, activeUserId, true);
    if (!customer) {
      throw new CheckoutError(
        'CUSTOMER_NOT_FOUND',
        `Active user "${String(activeUserId)}" does not have a customer record.`,
      );
    }

    return String(customer.id);
  }

  private createMasterContext(ctx: RequestContext): RequestContext {
    const masterCtx = ctx.copy();
    masterCtx.setReplicationMode('master');
    return masterCtx;
  }
}

/**
 * Calculate checkout totals from cart items.
 *
 * @param items - Cart items with fresh SQL prices
 * @param regionalDiscountPercent - Optional default regional discount (0-80)
 */
export function calculateCheckoutTotals(
  items: readonly CheckoutCartItem[],
  regionalDiscountPercent = 0,
): CheckoutTotals {
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0,
  );
  const discountedSubtotalCents = items.reduce((sum, item) => {
    const linePrice = item.priceCents * item.quantity;
    const itemDiscount = item.regionalDiscountPercent ?? regionalDiscountPercent;
    return sum + applyRegionalDiscount(linePrice, itemDiscount);
  }, 0);

  const platformFeeCents = items.reduce((sum, item) => {
    const itemFee = calculatePlatformFee(item.priceCents, item.takeRate);
    return sum + itemFee * item.quantity;
  }, 0);

  return {
    subtotalCents,
    discountedSubtotalCents,
    platformFeeCents,
    totalCents: discountedSubtotalCents,
  };
}

/**
 * Validate a checkout cart before proceeding to payment.
 * All prices must be > 0 (free products don't go through checkout).
 */
export function validateCheckoutCart(
  items: readonly CheckoutCartItem[],
): CheckoutValidation {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push('Cart is empty');
    return { valid: false, errors };
  }

  for (const item of items) {
    if (item.priceCents <= 0) {
      errors.push(`Product "${item.title}" has invalid price: ${item.priceCents}`);
    }
    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      errors.push(`Product "${item.title}" has invalid quantity: ${item.quantity}`);
    }
    if (item.takeRate < MIN_TAKE_RATE) {
      errors.push(
        `Product "${item.title}" has take rate below minimum (${item.takeRate}% < ${MIN_TAKE_RATE}%)`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build Hyperswitch payment creation params from checkout data.
 */
export function buildCheckoutPaymentParams(opts: {
  items: readonly CheckoutCartItem[];
  customerId: string;
  currency: string;
  returnUrl: string;
  orderId: string;
  regionalDiscountPercent?: number;
}): CreateHyperswitchPaymentParams {
  const totals = calculateCheckoutTotals(opts.items, opts.regionalDiscountPercent);

  const orderDetails: HyperswitchOrderDetail[] = opts.items.map((item) => ({
    productName: item.title,
    quantity: item.quantity,
    amount: applyRegionalDiscount(
      item.priceCents * item.quantity,
      item.regionalDiscountPercent ?? opts.regionalDiscountPercent ?? 0,
    ),
    productId: item.productId,
  }));

  return {
    amount: totals.totalCents,
    currency: opts.currency,
    customerId: opts.customerId,
    captureMethod: 'automatic',
    returnUrl: opts.returnUrl,
    merchantOrderReferenceId: opts.orderId,
    orderDetails,
    metadata: buildOrderMetadata(opts.orderId, opts.items, opts.customerId),
    confirm: false,
  };
}

/**
 * Build order metadata for Hyperswitch payment tracking.
 */
export function buildOrderMetadata(
  orderId: string,
  items: readonly CheckoutCartItem[],
  customerId: string,
): Record<string, string> {
  return {
    orderId,
    customerId,
    productIds: items.map((i) => i.productId).join(','),
    itemCount: String(items.length),
  };
}

const ZERO_TOTALS: CheckoutTotals = {
  subtotalCents: 0,
  discountedSubtotalCents: 0,
  platformFeeCents: 0,
  totalCents: 0,
};

function normalizeRequestedItems(
  requestedItems: readonly RequestedCheckoutCartItem[],
): RequestedCheckoutCartItem[] {
  if (requestedItems.length === 0) {
    throw new CheckoutError('EMPTY_CART', 'Cart is empty');
  }

  const mergedItems = new Map<string, number>();
  for (const requestedItem of requestedItems) {
    const productId = normalizeRequiredString(requestedItem.productId, 'productId');
    if (!Number.isInteger(requestedItem.quantity) || requestedItem.quantity <= 0) {
      throw new CheckoutError(
        'INVALID_QUANTITY',
        `Product "${productId}" has invalid quantity: ${requestedItem.quantity}`,
      );
    }
    mergedItems.set(productId, (mergedItems.get(productId) ?? 0) + requestedItem.quantity);
  }

  return Array.from(mergedItems.entries(), ([productId, quantity]) => ({ productId, quantity }));
}

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new CheckoutError('INVALID_INPUT', `${fieldName} is required.`);
  }

  return normalized;
}

function readProductTakeRate(product: Product): number {
  const customFields = toRecord(product.customFields);
  const takeRate = Number(customFields?.['platformTakeRate'] ?? MIN_TAKE_RATE);
  return Number.isFinite(takeRate) ? takeRate : MIN_TAKE_RATE;
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
