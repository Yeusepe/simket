/**
 * Purpose: Expose admin and shop GraphQL operations for structured product metadata.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - https://docs.vendure.io/guides/developer-guide/custom-fields/
 * Tests:
 *   - packages/vendure-server/src/plugins/product-metadata/product-metadata.resolver.test.ts
 */
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  Allow,
  Ctx,
  Permission,
  Transaction,
  type RequestContext,
} from '@vendure/core';
import { gql } from 'graphql-tag';
import { ProductMetadataService } from './product-metadata.service.js';

export const productMetadataAdminApiExtensions = gql`
  scalar JSON

  type ProductMetadata {
    productId: ID!
    tryAvatarUrl: String
    avatarRanking: Int!
    compatibilityFlags: [String!]!
    platformSupport: [String!]!
    usesVrcFury: Boolean!
    customIcons: JSON
    metadata: JSON!
  }

  extend type Query {
    getProductMetadata(productId: ID!): ProductMetadata
  }

  extend type Mutation {
    setProductMetadata(productId: ID!, metadata: JSON!): ProductMetadata!
  }
`;

export const productMetadataShopApiExtensions = gql`
  scalar JSON

  type ProductMetadata {
    productId: ID!
    tryAvatarUrl: String
    avatarRanking: Int!
    compatibilityFlags: [String!]!
    platformSupport: [String!]!
    usesVrcFury: Boolean!
    customIcons: JSON
    metadata: JSON!
  }

  extend type Query {
    productMetadata(productId: ID!): ProductMetadata
  }
`;

@Resolver()
export class ProductMetadataAdminResolver {
  constructor(private readonly productMetadataService: ProductMetadataService) {}

  @Mutation()
  @Transaction()
  @Allow(Permission.SuperAdmin, Permission.Owner)
  setProductMetadata(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
    @Args('metadata') metadata: unknown,
  ) {
    return this.productMetadataService.setProductMetadata(ctx, String(productId), metadata);
  }

  @Query()
  @Allow(Permission.SuperAdmin, Permission.Owner)
  getProductMetadata(@Ctx() ctx: RequestContext, @Args('productId') productId: string) {
    return this.productMetadataService.getProductMetadata(ctx, String(productId));
  }
}

@Resolver()
export class ProductMetadataShopResolver {
  constructor(private readonly productMetadataService: ProductMetadataService) {}

  @Query()
  @Allow(Permission.Owner)
  productMetadata(@Ctx() ctx: RequestContext, @Args('productId') productId: string) {
    return this.productMetadataService.getProductMetadata(ctx, String(productId));
  }
}
