/**
 * Purpose: Expose Better Auth-backed catalog and creator dashboard GraphQL
 *          queries/mutations through the Vendure shop API.
 * Governing docs:
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/better-auth-bridge/better-auth-bridge.service.test.ts
 */
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, Transaction, type RequestContext } from '@vendure/core';
import { gql } from 'graphql-tag';
import { CreatorCatalogService, type CreatorDashboardData, type CreatorProductInput, type CreatorProductSummary, type CatalogProductDetail, type CatalogProductSummary } from './better-auth-bridge.service.js';

export const betterAuthBridgeShopApiExtensions = gql`
  type CatalogProduct {
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
    creatorAvatarUrl: String
    tags: [String!]!
    categorySlug: String
    previewColor: String
  }

  type CatalogProductVariant {
    id: ID!
    name: String!
    price: Int!
    currencyCode: String!
    sku: String!
    stockLevel: String!
  }

  type CatalogProductCreator {
    id: ID!
    name: String!
    avatarUrl: String
  }

  type CatalogProductDetail {
    id: ID!
    slug: String!
    name: String!
    description: String!
    tiptapDescription: String!
    currencyCode: String!
    heroMediaUrl: String
    heroMediaType: String!
    heroTransparentUrl: String
    heroBackgroundUrl: String
    termsOfService: String!
    tags: [String!]!
    categorySlug: String
    creator: CatalogProductCreator!
    variants: [CatalogProductVariant!]!
    requiredProductIds: [String!]!
    dependencyRequirements: [String!]!
    availableBundles: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CreatorProductSummary {
    id: ID!
    name: String!
    slug: String!
    price: Int!
    currency: String!
    visibility: String!
    salesCount: Int!
    revenue: Int!
    heroImageUrl: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CreatorDashboardStats {
    totalRevenue: Int!
    totalSales: Int!
    totalViews: Int!
    conversionRate: Float!
    revenueChange: Float!
    salesChange: Float!
  }

  type CreatorActivityItem {
    id: ID!
    type: String!
    title: String!
    description: String!
    timestamp: DateTime!
  }

  type CreatorQuickAction {
    id: ID!
    label: String!
    icon: String!
    href: String!
  }

  type CreatorDashboardData {
    creatorName: String!
    stats: CreatorDashboardStats!
    activityItems: [CreatorActivityItem!]!
    quickActions: [CreatorQuickAction!]!
  }

  input CreatorProductInput {
    name: String!
    slug: String!
    description: String!
    shortDescription: String!
    price: Int!
    compareAtPrice: Int
    currency: String!
    platformFeePercent: Int!
    tags: [String!]!
    termsOfService: String!
    visibility: String!
  }

  extend type Query {
    catalogProducts(limit: Int): [CatalogProduct!]!
    catalogProduct(slug: String!): CatalogProductDetail!
    creatorDashboardData: CreatorDashboardData!
    creatorProducts: [CreatorProductSummary!]!
  }

  extend type Mutation {
    upsertCreatorProduct(productId: ID, input: CreatorProductInput!): CreatorProductSummary!
    deleteCreatorProduct(productId: ID!): Boolean!
    duplicateCreatorProduct(productId: ID!): CreatorProductSummary!
  }
`;

@Resolver()
export class BetterAuthBridgeResolver {
  constructor(private readonly creatorCatalogService: CreatorCatalogService) {}

  @Query()
  @Allow(Permission.Public)
  async catalogProducts(
    @Ctx() ctx: RequestContext,
    @Args('limit', { nullable: true }) limit?: number,
  ): Promise<readonly CatalogProductSummary[]> {
    return this.creatorCatalogService.listCatalogProducts(ctx, limit ?? 12);
  }

  @Query()
  @Allow(Permission.Public)
  async catalogProduct(
    @Ctx() ctx: RequestContext,
    @Args('slug') slug: string,
  ): Promise<CatalogProductDetail> {
    return this.creatorCatalogService.getCatalogProduct(ctx, slug);
  }

  @Query()
  @Allow(Permission.Owner)
  async creatorDashboardData(@Ctx() ctx: RequestContext): Promise<CreatorDashboardData> {
    return this.creatorCatalogService.getCreatorDashboardData(ctx);
  }

  @Query()
  @Allow(Permission.Owner)
  async creatorProducts(@Ctx() ctx: RequestContext): Promise<readonly CreatorProductSummary[]> {
    return this.creatorCatalogService.listCreatorProducts(ctx);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  async upsertCreatorProduct(
    @Ctx() ctx: RequestContext,
    @Args('productId', { nullable: true }) productId: string | undefined,
    @Args('input') input: CreatorProductInput,
  ): Promise<CreatorProductSummary> {
    return this.creatorCatalogService.upsertCreatorProduct(ctx, productId, input);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  async deleteCreatorProduct(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
  ): Promise<boolean> {
    return this.creatorCatalogService.deleteCreatorProduct(ctx, productId);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  async duplicateCreatorProduct(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
  ): Promise<CreatorProductSummary> {
    return this.creatorCatalogService.duplicateCreatorProduct(ctx, productId);
  }
}
