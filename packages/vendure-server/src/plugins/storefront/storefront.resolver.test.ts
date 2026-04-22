/**
 * Purpose: Verify storefront page resolver argument parsing and service delegation.
 * Governing docs:
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/architecture.md (§5 service ownership, Storefront plugin)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/storefront/storefront.resolver.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import { StorefrontPageResolver } from './storefront.resolver.js';
import type { StorefrontPageService } from './storefront.service.js';

describe('StorefrontPageResolver', () => {
  it('delegates creator store and page queries', async () => {
    const storefrontPageService = {
      getCreatorStore: vi.fn().mockResolvedValue(null),
      getCreatorStorefrontPage: vi.fn().mockResolvedValue(null),
      upsertCreatorStorefrontPage: vi.fn(),
      deleteCreatorStorefrontPage: vi.fn(),
    } as unknown as StorefrontPageService;
    const resolver = new StorefrontPageResolver(storefrontPageService);
    const ctx = {} as RequestContext;

    await resolver.creatorStore(ctx, 'alex-creator');
    await resolver.creatorStorefrontPage(ctx, 'product', 'product-detail', 'product-1');

    expect(
      (storefrontPageService as { getCreatorStore: ReturnType<typeof vi.fn> }).getCreatorStore,
    ).toHaveBeenCalledWith(ctx, 'alex-creator');
    expect(
      (storefrontPageService as { getCreatorStorefrontPage: ReturnType<typeof vi.fn> }).getCreatorStorefrontPage,
    ).toHaveBeenCalledWith(ctx, 'product', 'product-detail', 'product-1');
  });

  it('delegates page mutations with parsed scope', async () => {
    const storefrontPageService = {
      getCreatorStore: vi.fn(),
      getCreatorStorefrontPage: vi.fn(),
      upsertCreatorStorefrontPage: vi.fn().mockResolvedValue({ id: 'page-1' }),
      deleteCreatorStorefrontPage: vi.fn().mockResolvedValue(true),
    } as unknown as StorefrontPageService;
    const resolver = new StorefrontPageResolver(storefrontPageService);
    const ctx = {} as RequestContext;

    await resolver.upsertCreatorStorefrontPage(ctx, {
      title: 'Store Home',
      slug: 'home',
      scope: 'universal',
      content: {
        version: 1,
        blocks: [],
      },
    });
    await resolver.deleteCreatorStorefrontPage(ctx, 'page-1');

    expect(
      (storefrontPageService as { upsertCreatorStorefrontPage: ReturnType<typeof vi.fn> }).upsertCreatorStorefrontPage,
    ).toHaveBeenCalledWith(ctx, {
      title: 'Store Home',
      slug: 'home',
      scope: 'universal',
      content: {
        version: 1,
        blocks: [],
      },
    });
    expect(
      (storefrontPageService as { deleteCreatorStorefrontPage: ReturnType<typeof vi.fn> }).deleteCreatorStorefrontPage,
    ).toHaveBeenCalledWith(ctx, 'page-1');
  });

  it('rejects unsupported scopes', () => {
    const storefrontPageService = {
      getCreatorStore: vi.fn(),
      getCreatorStorefrontPage: vi.fn(),
      upsertCreatorStorefrontPage: vi.fn(),
      deleteCreatorStorefrontPage: vi.fn(),
    } as unknown as StorefrontPageService;
    const resolver = new StorefrontPageResolver(storefrontPageService);

    expect(() =>
      resolver.creatorStorefrontPage({} as RequestContext, 'unknown', 'home'),
    ).toThrow(/unsupported store page scope/i);
  });
});
