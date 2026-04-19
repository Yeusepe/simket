/**
 * Purpose: Verify dependency resolver delegation and owner-scoped storefront access.
 * Governing docs:
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §5 service ownership)
 *   - docs/architecture.md (§5 service ownership)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/vendure-server/src/plugins/dependency/dependency.resolver.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import type { RequestContext } from '@vendure/core';
import { DependencyAdminResolver, DependencyShopResolver } from './dependency.api.js';
import type { DependencyService } from './dependency.service.js';

describe('Dependency resolvers', () => {
  it('delegates admin dependency queries and mutations', async () => {
    const dependencyService = {
      getProductDependencies: vi.fn().mockResolvedValue([]),
      addDependency: vi.fn().mockResolvedValue({ id: 'dependency-1' }),
      removeDependency: vi.fn().mockResolvedValue(true),
      checkDependenciesForProduct: vi.fn(),
      getProductRequirements: vi.fn(),
    } as unknown as DependencyService;
    const resolver = new DependencyAdminResolver(dependencyService);
    const ctx = {} as RequestContext;

    await resolver.productDependencies(ctx, 'product-1');
    await resolver.addDependency(ctx, 'product-1', 'product-0', 10, true, 'Own the base pack first');
    await resolver.removeDependency(ctx, 'product-1', 'product-0');

    expect((dependencyService as { getProductDependencies: ReturnType<typeof vi.fn> }).getProductDependencies)
      .toHaveBeenCalledWith('product-1', ctx);
    expect((dependencyService as { addDependency: ReturnType<typeof vi.fn> }).addDependency)
      .toHaveBeenCalledWith(
        {
          productId: 'product-1',
          requiredProductId: 'product-0',
          discountPercent: 10,
          enabled: true,
          message: 'Own the base pack first',
        },
        ctx,
      );
    expect((dependencyService as { removeDependency: ReturnType<typeof vi.fn> }).removeDependency)
      .toHaveBeenCalledWith('product-1', 'product-0', ctx);
  });

  it('requires an authenticated user for shop dependency queries', async () => {
    const dependencyService = {
      getProductDependencies: vi.fn(),
      addDependency: vi.fn(),
      removeDependency: vi.fn(),
      checkDependenciesForProduct: vi.fn(),
      getProductRequirements: vi.fn(),
    } as unknown as DependencyService;
    const resolver = new DependencyShopResolver(dependencyService);

    expect(() => resolver.checkDependenciesMet({} as RequestContext, 'product-1')).toThrow(
      /authenticated user/i,
    );
    expect(() => resolver.productRequirements({} as RequestContext, 'product-1')).toThrow(
      /authenticated user/i,
    );
  });

  it('delegates shop dependency queries after ownership checks', async () => {
    const dependencyService = {
      getProductDependencies: vi.fn(),
      addDependency: vi.fn(),
      removeDependency: vi.fn(),
      checkDependenciesForProduct: vi.fn().mockResolvedValue({ met: true, missing: [], discount: 10 }),
      getProductRequirements: vi.fn().mockResolvedValue([]),
    } as unknown as DependencyService;
    const resolver = new DependencyShopResolver(dependencyService);
    const ctx = { activeUserId: 'user-1' } as RequestContext;

    await resolver.checkDependenciesMet(ctx, 'product-1');
    await resolver.productRequirements(ctx, 'product-1');

    expect((dependencyService as { checkDependenciesForProduct: ReturnType<typeof vi.fn> }).checkDependenciesForProduct)
      .toHaveBeenCalledWith('product-1', 'user-1', ctx);
    expect((dependencyService as { getProductRequirements: ReturnType<typeof vi.fn> }).getProductRequirements)
      .toHaveBeenCalledWith('product-1', 'user-1', ctx);
  });
});
