/**
 * Purpose: Expose creator settlement history and earnings through Vendure's admin API.
 * Governing docs:
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership, §6 purchase flow)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - packages/vendure-server/node_modules/@vendure/core/dist/api/decorators/allow.decorator.d.ts
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/settlement.resolver.test.ts
 */
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, type RequestContext } from '@vendure/core';
import { SettlementEntity, SettlementStatus } from './settlement.entity.js';
import {
  SettlementService,
  type SettlementEarningsSummary,
  type SettlementHistoryFilter,
} from './settlement.service.js';

@Resolver()
export class SettlementResolver {
  constructor(private readonly settlementService: SettlementService) {}

  @Query()
  @Allow(Permission.Owner)
  settlementHistory(
    @Ctx() ctx: RequestContext,
    @Args('creatorId') creatorId: string,
    @Args('status', { nullable: true }) status?: string,
    @Args('orderId', { nullable: true }) orderId?: string,
    @Args('skip', { nullable: true }) skip?: number,
    @Args('take', { nullable: true }) take?: number,
  ): Promise<SettlementEntity[]> {
    const filter: SettlementHistoryFilter = {
      orderId,
      skip,
      take,
      status: status ? this.parseStatus(status) : undefined,
    };
    return this.settlementService.getSettlementHistory(ctx, creatorId, filter);
  }

  @Query()
  @Allow(Permission.Owner)
  settlementEarnings(
    @Ctx() ctx: RequestContext,
    @Args('creatorId') creatorId: string,
  ): Promise<SettlementEarningsSummary> {
    return this.settlementService.getEarningsSummary(ctx, creatorId);
  }

  private parseStatus(value: string): SettlementStatus {
    const normalized = value.trim().toLowerCase();
    switch (normalized) {
      case SettlementStatus.Pending:
        return SettlementStatus.Pending;
      case SettlementStatus.Processing:
        return SettlementStatus.Processing;
      case SettlementStatus.Completed:
        return SettlementStatus.Completed;
      case SettlementStatus.Failed:
        return SettlementStatus.Failed;
      default:
        throw new Error(`Unsupported settlement status "${value}"`);
    }
  }
}
