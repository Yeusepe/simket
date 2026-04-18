/**
 * Purpose: Expose wishlist queries and mutations through the Vendure shop API.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/service/services/customer.service.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/wishlist/wishlist.service.test.ts
 */
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  Allow,
  Ctx,
  CustomerService,
  Permission,
  Transaction,
  type RequestContext,
} from '@vendure/core';
import { gql } from 'graphql-tag';
import { WishlistService, type WishlistListItem, type WishlistPage } from './wishlist.service.js';

export const wishlistShopApiExtensions = gql`
  type WishlistProduct {
    id: ID!
    slug: String!
    name: String!
    description: String!
    priceMin: Int!
    priceMax: Int!
    currencyCode: String!
    heroImageUrl: String
    heroTransparentUrl: String
    creatorName: String!
    tags: [String!]!
    categorySlug: String
  }

  type WishlistItem implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    customerId: String!
    productId: String!
    addedAt: DateTime!
    notifyOnPriceDrop: Boolean!
    product: WishlistProduct!
  }

  type WishlistPage {
    items: [WishlistItem!]!
    totalItems: Int!
    page: Int!
    limit: Int!
  }

  extend type Query {
    wishlist(page: Int, limit: Int): WishlistPage!
    isInWishlist(productId: ID!): Boolean!
    wishlistCount: Int!
  }

  extend type Mutation {
    addToWishlist(productId: ID!, notifyOnPriceDrop: Boolean): WishlistItem!
    removeFromWishlist(productId: ID!): Boolean!
  }
`;

@Resolver()
export class WishlistResolver {
  constructor(
    private readonly wishlistService: WishlistService,
    private readonly customerService: CustomerService,
  ) {}

  @Query()
  @Allow(Permission.Owner)
  async wishlist(
    @Ctx() ctx: RequestContext,
    @Args('page', { nullable: true }) page?: number,
    @Args('limit', { nullable: true }) limit?: number,
  ): Promise<WishlistPage> {
    return this.wishlistService.getWishlist(await this.requireActiveCustomerId(ctx), { page, limit }, ctx);
  }

  @Query()
  @Allow(Permission.Owner)
  async isInWishlist(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
  ): Promise<boolean> {
    return this.wishlistService.isInWishlist(await this.requireActiveCustomerId(ctx), String(productId), ctx);
  }

  @Query()
  @Allow(Permission.Owner)
  async wishlistCount(@Ctx() ctx: RequestContext): Promise<number> {
    return this.wishlistService.getWishlistCount(await this.requireActiveCustomerId(ctx), ctx);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  async addToWishlist(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
    @Args('notifyOnPriceDrop', { nullable: true }) notifyOnPriceDrop?: boolean,
  ): Promise<WishlistListItem> {
    const customerId = await this.requireActiveCustomerId(ctx);
    await this.wishlistService.addToWishlist(customerId, String(productId), notifyOnPriceDrop ?? false, ctx);
    const wishlist = await this.wishlistService.getWishlist(customerId, { page: 1, limit: 1 }, ctx);
    const item = wishlist.items.find((entry) => entry.productId === String(productId));
    if (!item) {
      throw new Error(`Wishlist item for product "${productId}" could not be loaded.`);
    }

    return item;
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  async removeFromWishlist(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
  ): Promise<boolean> {
    return this.wishlistService.removeFromWishlist(await this.requireActiveCustomerId(ctx), String(productId), ctx);
  }

  private async requireActiveCustomerId(ctx: RequestContext): Promise<string> {
    const activeUserId = ctx.activeUserId;
    if (!activeUserId) {
      throw new Error('Wishlist access requires an authenticated user.');
    }

    const customer = await this.customerService.findOneByUserId(ctx, activeUserId, true);
    if (!customer) {
      throw new Error(`Active user "${String(activeUserId)}" does not have a customer record.`);
    }

    return String(customer.id);
  }
}
