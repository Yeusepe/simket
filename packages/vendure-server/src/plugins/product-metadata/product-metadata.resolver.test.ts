/**
 * Purpose: Verify product metadata resolver delegation for admin and shop APIs.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/product-metadata/product-metadata.resolver.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import {
  ProductMetadataAdminResolver,
  ProductMetadataShopResolver,
} from './product-metadata.api.js';
import type { ProductMetadataService } from './product-metadata.service.js';

describe('Product metadata resolvers', () => {
  it('delegates admin get/set operations', async () => {
    const productMetadataService = {
      setProductMetadata: vi.fn().mockResolvedValue({ productId: 'product-1' }),
      getProductMetadata: vi.fn().mockResolvedValue({ productId: 'product-1' }),
    } as unknown as ProductMetadataService;
    const resolver = new ProductMetadataAdminResolver(productMetadataService);
    const ctx = {} as RequestContext;
    const metadata = { tryAvatarUrl: 'https://example.com/avatar', usesVrcFury: true };

    await resolver.setProductMetadata(ctx, 'product-1', metadata);
    const result = await resolver.getProductMetadata(ctx, 'product-1');

    expect((productMetadataService as { setProductMetadata: ReturnType<typeof vi.fn> }).setProductMetadata).toHaveBeenCalledWith(
      ctx,
      'product-1',
      metadata,
    );
    expect((productMetadataService as { getProductMetadata: ReturnType<typeof vi.fn> }).getProductMetadata).toHaveBeenCalledWith(
      ctx,
      'product-1',
    );
    expect(result).toEqual({ productId: 'product-1' });
  });

  it('delegates shop product metadata reads', async () => {
    const productMetadataService = {
      setProductMetadata: vi.fn(),
      getProductMetadata: vi.fn().mockResolvedValue({ productId: 'product-2' }),
    } as unknown as ProductMetadataService;
    const resolver = new ProductMetadataShopResolver(productMetadataService);
    const ctx = {} as RequestContext;

    const result = await resolver.productMetadata(ctx, 'product-2');

    expect((productMetadataService as { getProductMetadata: ReturnType<typeof vi.fn> }).getProductMetadata).toHaveBeenCalledWith(
      ctx,
      'product-2',
    );
    expect(result).toEqual({ productId: 'product-2' });
  });
});
