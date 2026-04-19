/**
 * Purpose: Verify gift resolver delegation, filter wiring, and owner-scoped access checks.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/gifts/gift.resolver.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import { GiftAdminResolver, GiftShopResolver } from './gift.api.js';
import type { GiftService } from './gift.service.js';

describe('Gift resolvers', () => {
  it('delegates admin gift queries', async () => {
    const giftService = {
      getGift: vi.fn().mockResolvedValue({ id: 'gift-1' }),
      listGifts: vi.fn().mockResolvedValue([]),
      getMyGifts: vi.fn(),
      sendGift: vi.fn(),
      claimGift: vi.fn(),
    } as unknown as GiftService;
    const resolver = new GiftAdminResolver(giftService);
    const ctx = {} as RequestContext;
    const filter = { status: 'PURCHASED', recipientEmail: 'friend@example.com' };

    await resolver.gift(ctx, 'gift-1');
    await resolver.gifts(ctx, filter);

    expect((giftService as { getGift: ReturnType<typeof vi.fn> }).getGift)
      .toHaveBeenCalledWith('gift-1', ctx);
    expect((giftService as { listGifts: ReturnType<typeof vi.fn> }).listGifts)
      .toHaveBeenCalledWith(filter, ctx);
  });

  it('requires an authenticated user for shop gift operations', async () => {
    const giftService = {
      getGift: vi.fn(),
      listGifts: vi.fn(),
      getMyGifts: vi.fn(),
      sendGift: vi.fn(),
      claimGift: vi.fn(),
    } as unknown as GiftService;
    const resolver = new GiftShopResolver(giftService);

    expect(() => resolver.myGifts({} as RequestContext)).toThrow(/authenticated user/i);
    expect(() => resolver.sendGift({} as RequestContext, 'product-1', 'friend@example.com')).toThrow(
      /authenticated user/i,
    );
    expect(() => resolver.claimGift({} as RequestContext, 'ABCD-EFGH-JKMN-PRST')).toThrow(
      /authenticated user/i,
    );
  });

  it('delegates shop gift operations after ownership checks', async () => {
    const giftService = {
      getGift: vi.fn(),
      listGifts: vi.fn(),
      getMyGifts: vi.fn().mockResolvedValue([]),
      sendGift: vi.fn().mockResolvedValue({ id: 'gift-1' }),
      claimGift: vi.fn().mockResolvedValue({ id: 'gift-1' }),
    } as unknown as GiftService;
    const resolver = new GiftShopResolver(giftService);
    const ctx = { activeUserId: 'user-1' } as RequestContext;

    await resolver.myGifts(ctx);
    await resolver.sendGift(ctx, 'product-1', 'friend@example.com');
    await resolver.claimGift(ctx, 'ABCD-EFGH-JKMN-PRST');

    expect((giftService as { getMyGifts: ReturnType<typeof vi.fn> }).getMyGifts)
      .toHaveBeenCalledWith('user-1', ctx);
    expect((giftService as { sendGift: ReturnType<typeof vi.fn> }).sendGift)
      .toHaveBeenCalledWith('user-1', 'product-1', 'friend@example.com', ctx);
    expect((giftService as { claimGift: ReturnType<typeof vi.fn> }).claimGift)
      .toHaveBeenCalledWith('user-1', 'ABCD-EFGH-JKMN-PRST', ctx);
  });
});
