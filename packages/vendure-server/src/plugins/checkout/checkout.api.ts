/**
 * Purpose: Expose checkout cart validation, initiation, and order status via the Vendure shop API.
 * Governing docs:
 *   - docs/architecture.md (§2 checkout reads skip cache, §5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §1.13 Hyperswitch)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/api/decorators/request-context.decorator.d.ts
 *   - packages/vendure-server/node_modules/@vendure/core/dist/api/decorators/transaction.decorator.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/checkout/checkout.resolver.test.ts
 *   - packages/vendure-server/src/plugins/checkout/checkout.service.test.ts
 */
import { Query, Mutation, Resolver, Args } from '@nestjs/graphql';
import {
  Allow,
  Ctx,
  Permission,
  Transaction,
  type RequestContext,
} from '@vendure/core';
import { gql } from 'graphql-tag';
import {
  CheckoutService,
  type RequestedCheckoutCartItem,
  type CheckoutInitiationResult,
  type CheckoutStatusResult,
  type CheckoutValidationResult,
} from './checkout.service.js';

export const checkoutShopApiExtensions = gql`
  input CheckoutCartItemInput {
    productId: ID!
    quantity: Int!
  }

  type CheckoutCartItem {
    productId: ID!
    title: String!
    priceCents: Int!
    quantity: Int!
    takeRate: Int!
    regionalDiscountPercent: Int
    currencyCode: String!
  }

  type CheckoutTotals {
    subtotalCents: Int!
    discountedSubtotalCents: Int!
    platformFeeCents: Int!
    totalCents: Int!
  }

  type CheckoutValidationResult {
    valid: Boolean!
    errors: [String!]!
    items: [CheckoutCartItem!]!
    totals: CheckoutTotals!
  }

  type CheckoutOrderDetail {
    productName: String!
    quantity: Int!
    amount: Int!
    productId: ID
  }

  type CheckoutPaymentPayload {
    amount: Int!
    currency: String!
    customerId: String
    captureMethod: String
    returnUrl: String
    confirm: Boolean!
    merchantOrderReferenceId: String
    metadata: JSON
    orderDetails: [CheckoutOrderDetail!]!
  }

  type CheckoutInitiationResult {
    orderId: ID!
    totals: CheckoutTotals!
    payment: CheckoutPaymentPayload!
  }

  type CheckoutStatus {
    orderId: ID!
    code: String!
    state: String!
    active: Boolean!
    totalWithTax: Int!
    currencyCode: String!
  }

  extend type Query {
    validateCart(items: [CheckoutCartItemInput!]!): CheckoutValidationResult!
    checkoutStatus(orderId: ID!): CheckoutStatus!
  }

  extend type Mutation {
    initiateCheckout(
      items: [CheckoutCartItemInput!]!
      returnUrl: String!
      orderId: ID!
    ): CheckoutInitiationResult!
  }
`;

@Resolver()
export class CheckoutResolver {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Query()
  @Allow(Permission.Owner)
  async validateCart(
    @Ctx() ctx: RequestContext,
    @Args('items') items: RequestedCheckoutCartItem[],
  ): Promise<CheckoutValidationResult> {
    return this.checkoutService.validateCart(ctx, normalizeCartItems(items));
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  async initiateCheckout(
    @Ctx() ctx: RequestContext,
    @Args('items') items: RequestedCheckoutCartItem[],
    @Args('returnUrl') returnUrl: string,
    @Args('orderId') orderId: string,
  ): Promise<CheckoutInitiationResult> {
    return this.checkoutService.initiateCheckout(ctx, normalizeCartItems(items), returnUrl, orderId);
  }

  @Query()
  @Allow(Permission.Owner)
  async checkoutStatus(
    @Ctx() ctx: RequestContext,
    @Args('orderId') orderId: string,
  ): Promise<CheckoutStatusResult> {
    return this.checkoutService.getCheckoutStatus(ctx, String(orderId));
  }
}

function normalizeCartItems(items: RequestedCheckoutCartItem[]): RequestedCheckoutCartItem[] {
  if (items.length === 0) {
    throw new Error('Checkout cart items must include a productId and positive integer quantity.');
  }

  return items.map((item) => {
    const productId = item.productId.trim();
    if (productId.length === 0 || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Checkout cart items must include a productId and positive integer quantity.');
    }

    return {
      productId,
      quantity: item.quantity,
    };
  });
}
