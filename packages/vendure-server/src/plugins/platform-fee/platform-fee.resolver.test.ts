import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import {
  PlatformFeeAdminResolver,
  PlatformFeeShopResolver,
} from './platform-fee.api.js';

describe('PlatformFee resolvers', () => {
  const ctx = {} as RequestContext;

  function createResolvers() {
    const platformFeeService = {
      setPlatformFee: vi.fn(),
      getPlatformFee: vi.fn(),
      getDefaults: vi.fn(),
    };

    return {
      platformFeeService,
      adminResolver: new PlatformFeeAdminResolver(platformFeeService as never),
      shopResolver: new PlatformFeeShopResolver(platformFeeService as never),
    };
  }

  it('delegates admin setPlatformFee', async () => {
    const { adminResolver, platformFeeService } = createResolvers();
    const expected = { productId: '1', feePercent: 12, minimumFeePercent: 5, recommendationBoost: 1.7 };
    platformFeeService.setPlatformFee.mockResolvedValue(expected);

    await expect(adminResolver.setPlatformFee(ctx, '1', 12)).resolves.toEqual(expected);
    expect(platformFeeService.setPlatformFee).toHaveBeenCalledWith(ctx, '1', 12);
  });

  it('delegates admin getPlatformFee', async () => {
    const { adminResolver, platformFeeService } = createResolvers();
    const expected = { productId: '1', feePercent: 5, minimumFeePercent: 5, recommendationBoost: 1 };
    platformFeeService.getPlatformFee.mockResolvedValue(expected);

    await expect(adminResolver.getPlatformFee(ctx, '1')).resolves.toEqual(expected);
    expect(platformFeeService.getPlatformFee).toHaveBeenCalledWith(ctx, '1');
  });

  it('delegates shop productPlatformFee', async () => {
    const { shopResolver, platformFeeService } = createResolvers();
    const expected = { productId: '1', feePercent: 9, minimumFeePercent: 5, recommendationBoost: 1.4 };
    platformFeeService.getPlatformFee.mockResolvedValue(expected);

    await expect(shopResolver.productPlatformFee(ctx, '1')).resolves.toEqual(expected);
    expect(platformFeeService.getPlatformFee).toHaveBeenCalledWith(ctx, '1');
  });

  it('delegates platformFeeDefaults', async () => {
    const { adminResolver, platformFeeService } = createResolvers();
    const expected = { defaultFeePercent: 5, minimumFeePercent: 5, maximumFeePercent: 100 };
    platformFeeService.getDefaults.mockReturnValue(expected);

    expect(await adminResolver.platformFeeDefaults(ctx)).toEqual(expected);
    expect(platformFeeService.getDefaults).toHaveBeenCalledWith();
  });
});
