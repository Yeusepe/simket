/**
 * Purpose: Verify collaborative revenue split calculations for settlement drafting.
 * Governing docs:
 *   - docs/architecture.md (§2, §5, §6 purchase flow)
 *   - docs/service-architecture.md (§1.6 Convex functions)
 *   - docs/domain-model.md (§4.4 Collaboration)
 * External references:
 *   - https://stripe.com/docs/connect/separate-charges-and-transfers
 * Tests:
 *   - packages/vendure-server/src/plugins/collaboration/revenue-split.service.test.ts
 */
import { describe, expect, it } from 'vitest';
import { RevenueSplitService, type CollaborativeOrder } from './revenue-split.service.js';

function createOrder(overrides: Partial<CollaborativeOrder> = {}): CollaborativeOrder {
  return {
    orderId: 'order-1',
    orderCode: 'ORDER-1',
    currencyCode: 'usd',
    transferGroup: 'ORDER-1',
    sourceTransactionId: 'ch_123',
    lines: [
      {
        orderLineId: 'line-1',
        productId: 'product-1',
        productName: 'Terrain Pack',
        lineAmount: 10001,
        ownerCreatorId: 'owner-1',
        ownerStripeAccountId: 'acct_owner',
        collaborations: [
          {
            creatorId: 'collab-1',
            stripeAccountId: 'acct_collab_1',
            revenueSharePercent: 33.33,
          },
          {
            creatorId: 'collab-2',
            stripeAccountId: 'acct_collab_2',
            revenueSharePercent: 33.33,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('RevenueSplitService', () => {
  it('allocates rounding remainder to the product owner', () => {
    const service = new RevenueSplitService();

    const result = service.calculateOrderSplits(createOrder());

    expect(result).toEqual([
      expect.objectContaining({
        creatorId: 'owner-1',
        amount: 3335,
        sharePercent: 33.34,
      }),
      expect.objectContaining({
        creatorId: 'collab-1',
        amount: 3333,
        sharePercent: 33.33,
      }),
      expect.objectContaining({
        creatorId: 'collab-2',
        amount: 3333,
        sharePercent: 33.33,
      }),
    ]);
    expect(result.reduce((sum, settlement) => sum + settlement.amount, 0)).toBe(10001);
  });

  it('returns settlements for each collaborative line in an order', () => {
    const service = new RevenueSplitService();
    const order = createOrder({
      lines: [
        ...createOrder().lines,
        {
          orderLineId: 'line-2',
          productId: 'product-2',
          productName: 'Sprite Sheet',
          lineAmount: 5000,
          ownerCreatorId: 'owner-2',
          ownerStripeAccountId: 'acct_owner_2',
          collaborations: [
            {
              creatorId: 'collab-3',
              stripeAccountId: 'acct_collab_3',
              revenueSharePercent: 20,
            },
          ],
        },
      ],
    });

    const result = service.calculateOrderSplits(order);

    expect(result).toHaveLength(5);
    expect(result.filter((settlement) => settlement.productId === 'product-2')).toEqual([
      expect.objectContaining({ creatorId: 'owner-2', amount: 4000 }),
      expect.objectContaining({ creatorId: 'collab-3', amount: 1000 }),
    ]);
  });

  it('skips non-collaborative lines', () => {
    const service = new RevenueSplitService();
    const order = createOrder({
      lines: [
        {
          orderLineId: 'line-1',
          productId: 'product-1',
          lineAmount: 1000,
          ownerCreatorId: 'owner-1',
          ownerStripeAccountId: 'acct_owner',
          collaborations: [],
        },
      ],
    });

    expect(service.calculateOrderSplits(order)).toEqual([]);
  });

  it('throws when a creator is missing a connected Stripe account', () => {
    const service = new RevenueSplitService();
    const order = createOrder({
      lines: [
        {
          ...createOrder().lines[0]!,
          ownerStripeAccountId: '',
        },
      ],
    });

    expect(() => service.calculateOrderSplits(order)).toThrow(/stripe connected account/i);
  });
});
