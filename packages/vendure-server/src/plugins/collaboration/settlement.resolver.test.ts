/**
 * Purpose: Verify settlement resolver query delegation and status parsing.
 * Governing docs:
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/settlement.resolver.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import { SettlementStatus } from './settlement.entity.js';
import { SettlementResolver } from './settlement.resolver.js';
import type { SettlementService } from './settlement.service.js';

describe('SettlementResolver', () => {
  it('delegates settlement history queries to the service', async () => {
    const getSettlementHistory = vi.fn().mockResolvedValue([]);
    const settlementService = {
      getSettlementHistory,
      getEarningsSummary: vi.fn(),
    } as unknown as SettlementService;
    const resolver = new SettlementResolver(settlementService);
    const ctx = {} as RequestContext;

    await resolver.settlementHistory(ctx, 'creator-1', 'COMPLETED', 'order-1', 5, 10);

    expect(getSettlementHistory).toHaveBeenCalledWith(ctx, 'creator-1', {
        status: SettlementStatus.Completed,
        orderId: 'order-1',
        skip: 5,
        take: 10,
      });
  });

  it('delegates earnings queries to the service', async () => {
    const getEarningsSummary = vi.fn().mockResolvedValue({ creatorId: 'creator-1' });
    const settlementService = {
      getSettlementHistory: vi.fn(),
      getEarningsSummary,
    } as unknown as SettlementService;
    const resolver = new SettlementResolver(settlementService);
    const ctx = {} as RequestContext;

    const result = await resolver.settlementEarnings(ctx, 'creator-1');

    expect(getEarningsSummary).toHaveBeenCalledWith(ctx, 'creator-1');
    expect(result).toEqual({ creatorId: 'creator-1' });
  });

  it('rejects unsupported settlement statuses', async () => {
    const settlementService = {
      getSettlementHistory: vi.fn(),
      getEarningsSummary: vi.fn(),
    } as unknown as SettlementService;
    const resolver = new SettlementResolver(settlementService);

    expect(() =>
      resolver.settlementHistory({} as RequestContext, 'creator-1', 'unknown'),
    ).toThrow(/unsupported settlement status/i);
  });
});
