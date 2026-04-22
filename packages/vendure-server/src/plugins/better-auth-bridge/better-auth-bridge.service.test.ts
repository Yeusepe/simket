import { describe, it, expect, vi, afterEach } from 'vitest';
import type { RequestContext } from '@vendure/core';
import { CreatorCatalogService } from './better-auth-bridge.service.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CreatorCatalogService', () => {
  it('ensures an active tax zone before creating a product variant', async () => {
    const productService = {
      create: vi.fn().mockResolvedValue({ id: 'product-1' }),
    };
    const productVariantService = {
      create: vi.fn().mockResolvedValue([]),
    };

    const service = new CreatorCatalogService(
      productService as never,
      productVariantService as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const ensureActiveTaxZone = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(service as never, 'ensureActiveTaxZone').mockImplementation(ensureActiveTaxZone);

    await (service as never).createCreatorProduct(
      {} as RequestContext,
      {
        name: 'Seed Product',
        slug: 'seed-product',
        description: 'Long description',
        shortDescription: 'Short description',
        price: 1500,
        currency: 'USD',
        platformFeePercent: 5,
        tags: [],
        termsOfService: 'Standard terms',
        visibility: 'published',
      },
      {},
    );

    expect(ensureActiveTaxZone).toHaveBeenCalledTimes(1);
    expect(productVariantService.create).toHaveBeenCalledTimes(1);
  });
});
