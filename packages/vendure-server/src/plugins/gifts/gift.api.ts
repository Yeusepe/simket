/**
 * Purpose: Expose gift purchase, claim, and review operations through Vendure GraphQL APIs.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/architecture.md (§5 service ownership)
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@nestjs/graphql/dist/decorators/args.decorator.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/gifts/gift.resolver.test.ts
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
import type { GiftFilter } from './gift.types.js';
import { GiftService } from './gift.service.js';

const giftTypeDefinitions = `
  type Gift implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    giftCode: String!
    productId: ID!
    senderUserId: String!
    recipientEmail: String!
    recipientUserId: String
    status: String!
    claimedAt: DateTime
  }

  input GiftFilterInput {
    status: String
    recipientEmail: String
    senderUserId: String
    recipientUserId: String
    productId: ID
  }
`;

export const giftAdminApiExtensions = gql`
  ${giftTypeDefinitions}

  extend type Query {
    gift(id: ID!): Gift
    gifts(filter: GiftFilterInput): [Gift!]!
  }
`;

export const giftShopApiExtensions = gql`
  ${giftTypeDefinitions}

  extend type Query {
    myGifts: [Gift!]!
  }

  extend type Mutation {
    sendGift(productId: ID!, recipientEmail: String!): Gift!
    claimGift(giftCode: String!): Gift!
  }
`;

@Resolver()
export class GiftAdminResolver {
  constructor(private readonly giftService: GiftService) {}

  @Query()
  @Allow(Permission.SuperAdmin)
  gift(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.giftService.getGift(id, ctx);
  }

  @Query()
  @Allow(Permission.SuperAdmin)
  gifts(
    @Ctx() ctx: RequestContext,
    @Args('filter', { nullable: true }) filter?: GiftFilter,
  ) {
    return this.giftService.listGifts(filter, ctx);
  }
}

@Resolver()
export class GiftShopResolver {
  constructor(private readonly giftService: GiftService) {}

  @Query()
  @Allow(Permission.Owner)
  myGifts(@Ctx() ctx: RequestContext) {
    return this.giftService.getMyGifts(this.requireActiveUserId(ctx), ctx);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  sendGift(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: string,
    @Args('recipientEmail') recipientEmail: string,
  ) {
    return this.giftService.sendGift(this.requireActiveUserId(ctx), productId, recipientEmail, ctx);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.Owner)
  claimGift(@Ctx() ctx: RequestContext, @Args('giftCode') giftCode: string) {
    return this.giftService.claimGift(this.requireActiveUserId(ctx), giftCode, ctx);
  }

  private requireActiveUserId(ctx: RequestContext): string {
    if (!ctx.activeUserId) {
      throw new Error('Gift operations require an authenticated user.');
    }

    return String(ctx.activeUserId);
  }
}
