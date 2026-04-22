/**
 * Purpose: Expose creator-store delivery and creator-owned page mutations
 *          through Vendure's shop GraphQL API.
 * Governing docs:
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership, Storefront plugin)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/storefront.resolver.test.ts
 */
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, Transaction, type RequestContext } from '@vendure/core';
import { isStorePageScope, type StorePageScope } from './storefront.shared.js';
import { StorefrontPageService, type UpsertCreatorStorefrontPageInput } from './storefront.service.js';

@Resolver()
export class StorefrontPageResolver {
  constructor(private readonly storefrontPageService: StorefrontPageService) {}

  @Query()
  @Allow(Permission.Public)
  creatorStore(
    @Ctx() ctx: RequestContext,
    @Args('creatorSlug') creatorSlug: string,
  ) {
    return this.storefrontPageService.getCreatorStore(ctx, creatorSlug);
  }

  @Query()
  @Allow(Permission.Owner)
  creatorStorefrontPage(
    @Ctx() ctx: RequestContext,
    @Args('scope') scope: string,
    @Args('slug') slug: string,
    @Args('productId', { nullable: true }) productId?: string,
  ) {
    return this.storefrontPageService.getCreatorStorefrontPage(
      ctx,
      this.parseScope(scope),
      slug,
      productId,
    );
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  upsertCreatorStorefrontPage(
    @Ctx() ctx: RequestContext,
    @Args('input') input: UpsertCreatorStorefrontPageInput,
  ) {
    return this.storefrontPageService.upsertCreatorStorefrontPage(ctx, {
      ...input,
      scope: this.parseScope(input.scope),
    });
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  deleteCreatorStorefrontPage(
    @Ctx() ctx: RequestContext,
    @Args('pageId') pageId: string,
  ) {
    return this.storefrontPageService.deleteCreatorStorefrontPage(ctx, pageId);
  }

  private parseScope(value: string): StorePageScope {
    const normalized = value.trim().toLowerCase();
    if (!isStorePageScope(normalized)) {
      throw new Error(`Unsupported store page scope "${value}"`);
    }

    return normalized;
  }
}
