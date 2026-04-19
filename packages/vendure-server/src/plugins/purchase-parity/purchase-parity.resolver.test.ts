import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import {
  PurchaseParityAdminResolver,
  PurchaseParityShopResolver,
} from './purchase-parity.api.js';

describe('PurchaseParity resolvers', () => {
  const ctx = {} as RequestContext;

  function createResolvers() {
    const purchaseParityService = {
      setRegionalPricing: vi.fn(),
      getRegionalPricing: vi.fn(),
      listRegions: vi.fn(),
      localizedPrice: vi.fn(),
    };

    return {
      purchaseParityService,
      adminResolver: new PurchaseParityAdminResolver(purchaseParityService as never),
      shopResolver: new PurchaseParityShopResolver(purchaseParityService as never),
    };
  }

  it('delegates setRegionalPricing', async () => {
    const { adminResolver, purchaseParityService } = createResolvers();
    const rules = [{ region: 'LATAM', discountPercent: 40 }];
    const expected = { productId: '1', rules };
    purchaseParityService.setRegionalPricing.mockResolvedValue(expected);

    await expect(adminResolver.setRegionalPricing(ctx, '1', rules)).resolves.toEqual(expected);
    expect(purchaseParityService.setRegionalPricing).toHaveBeenCalledWith(ctx, '1', rules);
  });

  it('delegates getRegionalPricing', async () => {
    const { adminResolver, purchaseParityService } = createResolvers();
    const expected = { productId: '1', rules: [{ region: 'BR', discountPercent: 50 }] };
    purchaseParityService.getRegionalPricing.mockResolvedValue(expected);

    await expect(adminResolver.getRegionalPricing(ctx, '1')).resolves.toEqual(expected);
    expect(purchaseParityService.getRegionalPricing).toHaveBeenCalledWith(ctx, '1');
  });

  it('delegates listRegions', async () => {
    const { adminResolver, purchaseParityService } = createResolvers();
    const expected = [{ code: 'LATAM', type: 'GROUP', parentRegion: null, countries: ['AR', 'BR'] }];
    purchaseParityService.listRegions.mockReturnValue(expected);

    expect(await adminResolver.listRegions(ctx)).toEqual(expected);
    expect(purchaseParityService.listRegions).toHaveBeenCalledWith();
  });

  it('delegates localizedPrice', async () => {
    const { shopResolver, purchaseParityService } = createResolvers();
    const expected = {
      productId: '1',
      countryCode: 'BR',
      region: 'LATAM',
      currencyCode: 'USD',
      basePriceCents: 1000,
      discountPercent: 50,
      localizedPriceCents: 500,
    };
    purchaseParityService.localizedPrice.mockResolvedValue(expected);

    await expect(shopResolver.localizedPrice(ctx, '1')).resolves.toEqual(expected);
    expect(purchaseParityService.localizedPrice).toHaveBeenCalledWith(ctx, '1');
  });
});
