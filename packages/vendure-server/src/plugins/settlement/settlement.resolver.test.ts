/**
 * Purpose: Verify standalone settlement resolver delegation to settlement processing services.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/settlement/settlement.resolver.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import { SettlementAdminResolver } from './settlement.api.js';
import type { SettlementService } from './settlement.service.js';

describe('SettlementAdminResolver', () => {
  it('delegates settlement processing operations', async () => {
    const settlementService = {
      processSettlement: vi.fn().mockResolvedValue({ id: 'settlement-1' }),
      getSettlementStatus: vi.fn().mockResolvedValue({ id: 'settlement-1' }),
      getPendingSettlements: vi.fn().mockResolvedValue([{ id: 'settlement-1' }]),
      retrySettlement: vi.fn().mockResolvedValue({ id: 'settlement-1', retryCount: 1 }),
    } as unknown as SettlementService;
    const resolver = new SettlementAdminResolver(settlementService);
    const ctx = {} as RequestContext;

    await resolver.processSettlement(ctx, 'order-1');
    await resolver.settlementStatus(ctx, 'order-1');
    const pending = await resolver.pendingSettlements(ctx);
    await resolver.retrySettlement(ctx, 'settlement-1');

    expect((settlementService as { processSettlement: ReturnType<typeof vi.fn> }).processSettlement).toHaveBeenCalledWith(
      ctx,
      'order-1',
    );
    expect((settlementService as { getSettlementStatus: ReturnType<typeof vi.fn> }).getSettlementStatus).toHaveBeenCalledWith(
      ctx,
      'order-1',
    );
    expect((settlementService as { getPendingSettlements: ReturnType<typeof vi.fn> }).getPendingSettlements).toHaveBeenCalledWith(
      ctx,
    );
    expect((settlementService as { retrySettlement: ReturnType<typeof vi.fn> }).retrySettlement).toHaveBeenCalledWith(
      ctx,
      'settlement-1',
    );
    expect(pending).toEqual([{ id: 'settlement-1' }]);
  });
});
