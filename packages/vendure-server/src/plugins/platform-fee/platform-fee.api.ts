/**
 * Purpose: Expose platform fee management through the Vendure shop and admin APIs.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/platform-fee/platform-fee.resolver.test.ts
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
  PlatformFeeService,
  type PlatformFeeDefaults,
  type PlatformFeeSummary,
} from './platform-fee.service.js';

export const platformFeeAdminApiExtensions = gql`
  type PlatformFeeInfo {
    productId: ID!
    feePercent: Int!
    defaultFeePercent: Int!
    minimumFeePercent: Int!
    maximumFeePercent: Int!
    recommendationBoost: Float!
  }

  type PlatformFeeDefaults {
    defaultFeePercent: Int!
    minimumFeePercent: Int!
    maximumFeePercent: Int!
  }

  extend type Query {
    getPlatformFee(productId: ID!): PlatformFeeInfo!
    platformFeeDefaults: PlatformFeeDefaults!
  }

  extend type Mutation {
    setPlatformFee(productId: ID!, feePercent: Int!): PlatformFeeInfo!
  }
`;

export const platformFeeShopApiExtensions = gql`
  type PlatformFeeInfo {
    productId: ID!
    feePercent: Int!
    defaultFeePercent: Int!
    minimumFeePercent: Int!
    maximumFeePercent: Int!
    recommendationBoost: Float!
  }

  extend type Query {
    productPlatformFee(productId: ID!): PlatformFeeInfo!
  }
`;

@Resolver()
export class PlatformFeeAdminResolver {
  constructor(private readonly platformFeeService: PlatformFeeService) {}

  @Mutation()
  @Transaction()
  @Allow(Permission.SuperAdmin)
  async setPlatformFee(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
    @Args('feePercent') feePercent: number,
  ): Promise<PlatformFeeSummary> {
    return this.platformFeeService.setPlatformFee(ctx, String(productId), feePercent);
  }

  @Query()
  @Allow(Permission.SuperAdmin)
  async getPlatformFee(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
  ): Promise<PlatformFeeSummary> {
    return this.platformFeeService.getPlatformFee(ctx, String(productId));
  }

  @Query()
  @Allow(Permission.SuperAdmin)
  async platformFeeDefaults(@Ctx() _ctx: RequestContext): Promise<PlatformFeeDefaults> {
    return this.platformFeeService.getDefaults();
  }
}

@Resolver()
export class PlatformFeeShopResolver {
  constructor(private readonly platformFeeService: PlatformFeeService) {}

  @Query()
  @Allow(Permission.Owner)
  async productPlatformFee(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
  ): Promise<PlatformFeeSummary> {
    return this.platformFeeService.getPlatformFee(ctx, String(productId));
  }
}
