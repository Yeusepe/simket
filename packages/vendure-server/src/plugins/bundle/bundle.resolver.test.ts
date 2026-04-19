/**
 * Purpose: Verify bundle resolver delegation and authenticated storefront access.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/bundle/bundle.resolver.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import { BundleAdminResolver, BundleShopResolver } from './bundle.api.js';
import type { BundleService } from './bundle.service.js';

describe('Bundle resolvers', () => {
  it('delegates admin queries and mutations to the bundle service', async () => {
    const bundleService = {
      getBundle: vi.fn().mockResolvedValue({ id: 'bundle-1' }),
      listBundles: vi.fn().mockResolvedValue([]),
      createBundle: vi.fn().mockResolvedValue({ id: 'bundle-1' }),
      updateBundle: vi.fn().mockResolvedValue({ id: 'bundle-1' }),
      deleteBundle: vi.fn().mockResolvedValue(true),
      listBundlesForProduct: vi.fn(),
    } as unknown as BundleService;
    const resolver = new BundleAdminResolver(bundleService);
    const ctx = {} as RequestContext;

    await resolver.bundle(ctx, 'bundle-1');
    await resolver.bundles(ctx);
    await resolver.createBundle(ctx, 'Starter Pack', ['product-1', 'product-2'], 15);
    await resolver.updateBundle(ctx, 'bundle-1', 'Starter Pack+', ['product-3'], 20);
    await resolver.deleteBundle(ctx, 'bundle-1');

    expect((bundleService as { getBundle: ReturnType<typeof vi.fn> }).getBundle)
      .toHaveBeenCalledWith('bundle-1', ctx, true);
    expect((bundleService as { listBundles: ReturnType<typeof vi.fn> }).listBundles)
      .toHaveBeenCalledWith(ctx, true);
    expect((bundleService as { createBundle: ReturnType<typeof vi.fn> }).createBundle)
      .toHaveBeenCalledWith(
        { name: 'Starter Pack', productIds: ['product-1', 'product-2'], discountPercent: 15 },
        ctx,
      );
    expect((bundleService as { updateBundle: ReturnType<typeof vi.fn> }).updateBundle)
      .toHaveBeenCalledWith(
        'bundle-1',
        { name: 'Starter Pack+', productIds: ['product-3'], discountPercent: 20 },
        ctx,
      );
    expect((bundleService as { deleteBundle: ReturnType<typeof vi.fn> }).deleteBundle)
      .toHaveBeenCalledWith('bundle-1', ctx);
  });

  it('requires an authenticated user for shop bundle queries', async () => {
    const bundleService = {
      getBundle: vi.fn(),
      listBundles: vi.fn(),
      createBundle: vi.fn(),
      updateBundle: vi.fn(),
      deleteBundle: vi.fn(),
      listBundlesForProduct: vi.fn(),
    } as unknown as BundleService;
    const resolver = new BundleShopResolver(bundleService);

    expect(() => resolver.bundle({} as RequestContext, 'bundle-1')).toThrow(
      /authenticated user/i,
    );
    expect(() => resolver.bundlesForProduct({} as RequestContext, 'product-1')).toThrow(
      /authenticated user/i,
    );
  });

  it('delegates shop queries after ownership checks', async () => {
    const bundleService = {
      getBundle: vi.fn().mockResolvedValue({ id: 'bundle-1' }),
      listBundles: vi.fn(),
      createBundle: vi.fn(),
      updateBundle: vi.fn(),
      deleteBundle: vi.fn(),
      listBundlesForProduct: vi.fn().mockResolvedValue([]),
    } as unknown as BundleService;
    const resolver = new BundleShopResolver(bundleService);
    const ctx = { activeUserId: 'user-1' } as RequestContext;

    await resolver.bundle(ctx, 'bundle-1');
    await resolver.bundlesForProduct(ctx, 'product-1');

    expect((bundleService as { getBundle: ReturnType<typeof vi.fn> }).getBundle)
      .toHaveBeenCalledWith('bundle-1', ctx, false);
    expect((bundleService as { listBundlesForProduct: ReturnType<typeof vi.fn> }).listBundlesForProduct)
      .toHaveBeenCalledWith('product-1', ctx);
  });
});
