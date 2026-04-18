/**
 * Purpose: Verify creator-store URL resolution supports both path and subdomain routing.
 * Governing docs:
 *   - docs/architecture.md (§5 service ownership, Framely integration)
 *   - docs/service-architecture.md (§1 client features, storefront routing)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing)
 * External references:
 *   - https://reactrouter.com/api/hooks/useParams
 * Tests:
 *   - packages/storefront/src/store/routing.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildStorePagePath,
  buildStoreProductPath,
  resolveStoreRoute,
} from './routing';

describe('resolveStoreRoute', () => {
  it('resolves a path-based store homepage', () => {
    expect(
      resolveStoreRoute({
        hostname: 'simket.com',
        pathname: '/store/alex-artist',
        params: { creatorSlug: 'alex-artist' },
      }),
    ).toMatchObject({
      isStoreRoute: true,
      strategy: 'path',
      routeKind: 'home',
      creatorSlug: 'alex-artist',
      basePath: '/store/alex-artist',
    });
  });

  it('resolves a path-based custom page', () => {
    expect(
      resolveStoreRoute({
        hostname: 'simket.com',
        pathname: '/store/alex-artist/about',
        params: { creatorSlug: 'alex-artist', pageSlug: 'about' },
      }),
    ).toMatchObject({
      isStoreRoute: true,
      strategy: 'path',
      routeKind: 'page',
      creatorSlug: 'alex-artist',
      pageSlug: 'about',
    });
  });

  it('resolves a subdomain product page', () => {
    expect(
      resolveStoreRoute({
        hostname: 'alex-artist.simket.com',
        pathname: '/product/shader-starter-kit',
        params: { productSlug: 'shader-starter-kit' },
      }),
    ).toMatchObject({
      isStoreRoute: true,
      strategy: 'subdomain',
      routeKind: 'product',
      creatorSlug: 'alex-artist',
      productSlug: 'shader-starter-kit',
      basePath: '/',
    });
  });

  it('ignores the root domain and reserved subdomains', () => {
    expect(
      resolveStoreRoute({
        hostname: 'www.simket.com',
        pathname: '/',
      }),
    ).toMatchObject({
      isStoreRoute: false,
      strategy: 'none',
      routeKind: 'none',
      creatorSlug: null,
    });

    expect(
      resolveStoreRoute({
        hostname: 'simket.com',
        pathname: '/product/marketplace-item',
      }),
    ).toMatchObject({
      isStoreRoute: false,
      strategy: 'none',
      routeKind: 'none',
      creatorSlug: null,
    });
  });

  it('treats invalid creator slugs as not found store routes', () => {
    expect(
      resolveStoreRoute({
        hostname: 'simket.com',
        pathname: '/store/Bad Slug',
        params: { creatorSlug: 'Bad Slug' },
      }),
    ).toMatchObject({
      isStoreRoute: true,
      strategy: 'path',
      routeKind: 'invalid',
      creatorSlug: 'Bad Slug',
    });
  });
});

describe('store route builders', () => {
  it('builds page and product links for path-based stores', () => {
    const route = resolveStoreRoute({
      hostname: 'simket.com',
      pathname: '/store/alex-artist',
      params: { creatorSlug: 'alex-artist' },
    });

    expect(buildStorePagePath(route, 'about')).toBe('/store/alex-artist/about');
    expect(buildStoreProductPath(route, 'shader-starter-kit')).toBe(
      '/store/alex-artist/product/shader-starter-kit',
    );
  });

  it('builds page and product links for subdomain stores', () => {
    const route = resolveStoreRoute({
      hostname: 'alex-artist.simket.com',
      pathname: '/',
    });

    expect(buildStorePagePath(route, 'about')).toBe('/about');
    expect(buildStoreProductPath(route, 'shader-starter-kit')).toBe(
      '/product/shader-starter-kit',
    );
  });
});
