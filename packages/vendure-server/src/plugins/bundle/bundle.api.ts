/**
 * Purpose: Expose bundle management and storefront bundle queries through Vendure GraphQL APIs.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/domain-model.md (§4.2 Bundle)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@nestjs/graphql/dist/decorators/args.decorator.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/bundle/bundle.resolver.test.ts
 */
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { gql } from 'graphql-tag';
import {
  Allow,
  Ctx,
  Permission,
  Transaction,
  type RequestContext,
} from '@vendure/core';
import { BundleService } from './bundle.service.js';

const bundleTypeDefinitions = `
  type BundlePricingLine {
    productId: ID!
    variantId: ID!
    originalPrice: Int!
    discountedPrice: Int!
    discountAmount: Int!
  }

  type BundlePricing {
    originalSubtotal: Int!
    discountedSubtotal: Int!
    discountTotal: Int!
    lines: [BundlePricingLine!]!
  }

  type Bundle implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    productIds: [ID!]!
    discountPercent: Int!
  }
`;

export const bundleAdminApiExtensions = gql`
  ${bundleTypeDefinitions}

  extend type Query {
    bundle(id: ID!): Bundle
    bundles: [Bundle!]!
  }

  extend type Mutation {
    createBundle(name: String!, productIds: [ID!]!, discountPercent: Int!): Bundle!
    updateBundle(id: ID!, name: String, productIds: [ID!], discountPercent: Int): Bundle!
    deleteBundle(id: ID!): Boolean!
  }
`;

export const bundleShopApiExtensions = gql`
  ${bundleTypeDefinitions}

  extend type Query {
    bundle(id: ID!): Bundle
    bundlesForProduct(productId: ID!): [Bundle!]!
  }
`;

@Resolver()
export class BundleAdminResolver {
  constructor(private readonly bundleService: BundleService) {}

  @Query()
  @Allow(Permission.SuperAdmin)
  bundle(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.bundleService.getBundle(id, ctx, true);
  }

  @Query()
  @Allow(Permission.SuperAdmin)
  bundles(@Ctx() ctx: RequestContext) {
    return this.bundleService.listBundles(ctx, true);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.SuperAdmin)
  createBundle(
    @Ctx() ctx: RequestContext,
    @Args('name') name: string,
    @Args('productIds') productIds: string[],
    @Args('discountPercent') discountPercent: number,
  ) {
    return this.bundleService.createBundle({ name, productIds, discountPercent }, ctx);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.SuperAdmin)
  updateBundle(
    @Ctx() ctx: RequestContext,
    @Args('id') id: string,
    @Args('name', { nullable: true }) name?: string,
    @Args('productIds', { nullable: true }) productIds?: string[],
    @Args('discountPercent', { nullable: true }) discountPercent?: number,
  ) {
    return this.bundleService.updateBundle(id, { name, productIds, discountPercent }, ctx);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.SuperAdmin)
  deleteBundle(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.bundleService.deleteBundle(id, ctx);
  }
}

@Resolver()
export class BundleShopResolver {
  constructor(private readonly bundleService: BundleService) {}

  @Query()
  @Allow(Permission.Owner)
  bundle(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    this.requireActiveUserId(ctx);
    return this.bundleService.getBundle(id, ctx, false);
  }

  @Query()
  @Allow(Permission.Owner)
  bundlesForProduct(@Ctx() ctx: RequestContext, @Args('productId') productId: string) {
    this.requireActiveUserId(ctx);
    return this.bundleService.listBundlesForProduct(productId, ctx);
  }

  private requireActiveUserId(ctx: RequestContext): string {
    if (!ctx.activeUserId) {
      throw new Error('Bundle queries require an authenticated user.');
    }

    return String(ctx.activeUserId);
  }
}
