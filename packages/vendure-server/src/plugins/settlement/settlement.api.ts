/**
 * Purpose: Expose admin GraphQL operations for standalone order settlement processing.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §1.13 Hyperswitch)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/service/services/order.service.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/settlement/settlement.resolver.test.ts
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
import { OrderSettlementStatus } from './settlement.entity.js';
import { SettlementService } from './settlement.service.js';

export const settlementAdminApiExtensions = gql`
  scalar JSON

  enum SettlementProcessStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }

  type OrderSettlement implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    orderId: ID!
    orderCode: String!
    amountCents: Int!
    currencyCode: String!
    status: SettlementProcessStatus!
    retryCount: Int!
    lastError: String
    payoutMetadata: JSON
    processedAt: DateTime
  }

  extend type Query {
    settlementStatus(orderId: ID!): OrderSettlement
    pendingSettlements: [OrderSettlement!]!
  }

  extend type Mutation {
    processSettlement(orderId: ID!): OrderSettlement!
    retrySettlement(id: ID!): OrderSettlement!
  }
`;

@Resolver()
export class SettlementAdminResolver {
  constructor(private readonly settlementService: SettlementService) {}

  @Mutation()
  @Transaction()
  @Allow(Permission.SuperAdmin)
  processSettlement(@Ctx() ctx: RequestContext, @Args('orderId') orderId: string) {
    return this.settlementService.processSettlement(ctx, String(orderId));
  }

  @Query()
  @Allow(Permission.SuperAdmin)
  settlementStatus(@Ctx() ctx: RequestContext, @Args('orderId') orderId: string) {
    return this.settlementService.getSettlementStatus(ctx, String(orderId));
  }

  @Query()
  @Allow(Permission.SuperAdmin)
  pendingSettlements(@Ctx() ctx: RequestContext) {
    return this.settlementService.getPendingSettlements(ctx);
  }

  @Mutation()
  @Transaction()
  @Allow(Permission.SuperAdmin)
  retrySettlement(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.settlementService.retrySettlement(ctx, String(id));
  }

  protected readonly settlementStatusEnum = OrderSettlementStatus;
}
