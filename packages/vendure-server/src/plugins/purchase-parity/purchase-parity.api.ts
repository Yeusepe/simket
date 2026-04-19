/**
 * Purpose: Expose creator-controlled purchase parity configuration through the Vendure APIs.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 *   - docs/domain-model.md (§4.1 Product pricing)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - https://docs.vendure.io/guides/core-concepts/channels/
 * Tests:
 *   - packages/vendure-server/src/plugins/purchase-parity/purchase-parity.resolver.test.ts
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
  PurchaseParityService,
  type LocalizedPriceResult,
  type PurchaseParityRegionDescriptor,
  type RegionalPricingRecord,
  type RegionalPricingRule,
} from './purchase-parity.service.js';

export const purchaseParityAdminApiExtensions = gql`
  input RegionalPricingRuleInput {
    region: String!
    discountPercent: Int!
  }

  type RegionalPricingRule {
    region: String!
    discountPercent: Int!
  }

  type RegionalPricingRecord {
    productId: ID!
    rules: [RegionalPricingRule!]!
  }

  type PurchaseParityRegion {
    code: String!
    type: String!
    parentRegion: String
    countries: [String!]!
  }

  extend type Query {
    getRegionalPricing(productId: ID!): RegionalPricingRecord!
    listRegions: [PurchaseParityRegion!]!
  }

  extend type Mutation {
    setRegionalPricing(
      productId: ID!
      rules: [RegionalPricingRuleInput!]!
    ): RegionalPricingRecord!
  }
`;

export const purchaseParityShopApiExtensions = gql`
  type LocalizedPrice {
    productId: ID!
    countryCode: String
    region: String
    currencyCode: String!
    basePriceCents: Int!
    discountPercent: Int!
    localizedPriceCents: Int!
  }

  extend type Query {
    localizedPrice(productId: ID!): LocalizedPrice!
  }
`;

@Resolver()
export class PurchaseParityAdminResolver {
  constructor(private readonly purchaseParityService: PurchaseParityService) {}

  @Mutation()
  @Transaction()
  @Allow(Permission.SuperAdmin)
  async setRegionalPricing(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
    @Args('rules') rules: RegionalPricingRule[],
  ): Promise<RegionalPricingRecord> {
    return this.purchaseParityService.setRegionalPricing(ctx, String(productId), rules);
  }

  @Query()
  @Allow(Permission.SuperAdmin)
  async getRegionalPricing(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
  ): Promise<RegionalPricingRecord> {
    return this.purchaseParityService.getRegionalPricing(ctx, String(productId));
  }

  @Query()
  @Allow(Permission.SuperAdmin)
  async listRegions(@Ctx() _ctx: RequestContext): Promise<PurchaseParityRegionDescriptor[]> {
    return this.purchaseParityService.listRegions();
  }
}

@Resolver()
export class PurchaseParityShopResolver {
  constructor(private readonly purchaseParityService: PurchaseParityService) {}

  @Query()
  @Allow(Permission.Owner)
  async localizedPrice(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
  ): Promise<LocalizedPriceResult> {
    return this.purchaseParityService.localizedPrice(ctx, String(productId));
  }
}
