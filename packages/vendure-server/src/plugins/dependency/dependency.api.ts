/**
 * Purpose: Expose dependency management and storefront prerequisite checks through Vendure GraphQL APIs.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/domain-model.md (§4.3 ProductDependency)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@nestjs/graphql/dist/decorators/args.decorator.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/dependency/dependency.resolver.test.ts
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
import { DependencyService } from './dependency.service.js';

const dependencyTypeDefinitions = `
  type ProductDependency implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    productId: ID!
    requiredProductId: ID!
    discountPercent: Int!
    enabled: Boolean!
    message: String
    requiredProductName: String
    requiredProductSlug: String
    owned: Boolean!
  }

  type DependencyCheck {
    met: Boolean!
    missing: [ID!]!
    discount: Int!
  }
`;

export const dependencyAdminApiExtensions = gql`
  ${dependencyTypeDefinitions}

  extend type Query {
    productDependencies(productId: ID!): [ProductDependency!]!
  }

  extend type Mutation {
    addDependency(
      productId: ID!
      requiredProductId: ID!
      discountPercent: Int
      enabled: Boolean
      message: String
    ): ProductDependency!
    removeDependency(productId: ID!, requiredProductId: ID!): Boolean!
  }
`;

export const dependencyShopApiExtensions = gql`
  ${dependencyTypeDefinitions}

  extend type Query {
    checkDependenciesMet(productId: ID!): DependencyCheck!
    productRequirements(productId: ID!): [ProductDependency!]!
  }
`;

@Resolver()
export class DependencyAdminResolver {
  constructor(private readonly dependencyService: DependencyService) {}

  @Query()
  @Allow(Permission.SuperAdmin)
  productDependencies(@Ctx() ctx: RequestContext, @Args('productId') productId: string) {
    return this.dependencyService.getProductDependencies(productId, ctx);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.SuperAdmin)
  addDependency(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
    @Args('requiredProductId') requiredProductId: string,
    @Args('discountPercent', { nullable: true }) discountPercent?: number,
    @Args('enabled', { nullable: true }) enabled?: boolean,
    @Args('message', { nullable: true }) message?: string,
  ) {
    return this.dependencyService.addDependency(
      { productId, requiredProductId, discountPercent, enabled, message },
      ctx,
    );
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.SuperAdmin)
  removeDependency(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
    @Args('requiredProductId') requiredProductId: string,
  ) {
    return this.dependencyService.removeDependency(productId, requiredProductId, ctx);
  }
}

@Resolver()
export class DependencyShopResolver {
  constructor(private readonly dependencyService: DependencyService) {}

  @Query()
  @Allow(Permission.Owner)
  checkDependenciesMet(@Ctx() ctx: RequestContext, @Args('productId') productId: string) {
    return this.dependencyService.checkDependenciesForProduct(
      productId,
      this.requireActiveUserId(ctx),
      ctx,
    );
  }

  @Query()
  @Allow(Permission.Owner)
  productRequirements(@Ctx() ctx: RequestContext, @Args('productId') productId: string) {
    return this.dependencyService.getProductRequirements(
      productId,
      this.requireActiveUserId(ctx),
      ctx,
    );
  }

  private requireActiveUserId(ctx: RequestContext): string {
    if (!ctx.activeUserId) {
      throw new Error('Dependency queries require an authenticated user.');
    }

    return String(ctx.activeUserId);
  }
}
