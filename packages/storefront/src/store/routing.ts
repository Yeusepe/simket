/**
 * Purpose: Resolve creator-store URLs for both /store path routing and *.simket.com subdomains.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront, §5 Framely integration)
 *   - docs/service-architecture.md (§1 client features)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§2 invariants)
 * External references:
 *   - https://reactrouter.com/api/hooks/useParams
 * Tests:
 *   - packages/storefront/src/store/routing.test.ts
 */
const CREATOR_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SUBDOMAINS = new Set(['www']);
const DEFAULT_STORE_DOMAIN = 'simket.com';

export type StoreRoutingStrategy = 'path' | 'subdomain' | 'none';
export type StoreRouteKind = 'home' | 'page' | 'product' | 'invalid' | 'none';

export interface StoreRouteResolution {
  readonly isStoreRoute: boolean;
  readonly strategy: StoreRoutingStrategy;
  readonly routeKind: StoreRouteKind;
  readonly creatorSlug: string | null;
  readonly pageSlug: string | null;
  readonly productSlug: string | null;
  readonly basePath: string;
}

interface ResolveStoreRouteOptions {
  readonly hostname: string;
  readonly pathname: string;
  readonly params?: {
    readonly creatorSlug?: string;
    readonly pageSlug?: string;
    readonly productSlug?: string;
  };
  readonly storeDomain?: string;
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/:\d+$/, '');
}

function normalizePathname(pathname: string): string {
  if (pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

function pathRoute(creatorSlug: string, routeKind: StoreRouteKind, pageSlug?: string, productSlug?: string): StoreRouteResolution {
  return {
    isStoreRoute: true,
    strategy: 'path',
    routeKind,
    creatorSlug,
    pageSlug: pageSlug ?? null,
    productSlug: productSlug ?? null,
    basePath: `/store/${creatorSlug}`,
  };
}

function subdomainRoute(creatorSlug: string, routeKind: StoreRouteKind, pageSlug?: string, productSlug?: string): StoreRouteResolution {
  return {
    isStoreRoute: true,
    strategy: 'subdomain',
    routeKind,
    creatorSlug,
    pageSlug: pageSlug ?? null,
    productSlug: productSlug ?? null,
    basePath: '/',
  };
}

export function isValidCreatorSlug(slug: string | null | undefined): slug is string {
  return typeof slug === 'string' && CREATOR_SLUG_PATTERN.test(slug);
}

export function resolveStoreRoute({
  hostname,
  pathname,
  params,
  storeDomain = DEFAULT_STORE_DOMAIN,
}: ResolveStoreRouteOptions): StoreRouteResolution {
  const normalizedPath = normalizePathname(pathname);
  const pathCreatorSlug = params?.creatorSlug;

  if (pathCreatorSlug !== undefined || normalizedPath.startsWith('/store/')) {
    const creatorSlug = pathCreatorSlug ?? normalizedPath.split('/')[2] ?? '';

    if (!isValidCreatorSlug(creatorSlug)) {
      return pathRoute(creatorSlug, 'invalid');
    }

    if (params?.productSlug) {
      return pathRoute(creatorSlug, 'product', undefined, params.productSlug);
    }

    if (params?.pageSlug) {
      return pathRoute(creatorSlug, 'page', params.pageSlug);
    }

    return pathRoute(creatorSlug, 'home');
  }

  const normalizedHost = normalizeHostname(hostname);
  const suffix = `.${storeDomain}`;

  if (normalizedHost.endsWith(suffix)) {
    const creatorSlug = normalizedHost.slice(0, -suffix.length);

    if (RESERVED_SUBDOMAINS.has(creatorSlug) || creatorSlug.length === 0) {
      return {
        isStoreRoute: false,
        strategy: 'none',
        routeKind: 'none',
        creatorSlug: null,
        pageSlug: null,
        productSlug: null,
        basePath: '/',
      };
    }

    if (!isValidCreatorSlug(creatorSlug)) {
      return subdomainRoute(creatorSlug, 'invalid');
    }

    if (params?.productSlug) {
      return subdomainRoute(creatorSlug, 'product', undefined, params.productSlug);
    }

    if (params?.pageSlug) {
      return subdomainRoute(creatorSlug, 'page', params.pageSlug);
    }

    if (normalizedPath === '/') {
      return subdomainRoute(creatorSlug, 'home');
    }

    const productMatch = normalizedPath.match(/^\/product\/([^/]+)$/);
    if (productMatch) {
      return subdomainRoute(creatorSlug, 'product', undefined, productMatch[1]);
    }

    const pageMatch = normalizedPath.match(/^\/([^/]+)$/);
    if (pageMatch) {
      return subdomainRoute(creatorSlug, 'page', pageMatch[1]);
    }

    return subdomainRoute(creatorSlug, 'invalid');
  }

  return {
    isStoreRoute: false,
    strategy: 'none',
    routeKind: 'none',
    creatorSlug: null,
    pageSlug: null,
    productSlug: null,
    basePath: '/',
  };
}

export function buildStoreHomePath(route: Pick<StoreRouteResolution, 'strategy' | 'creatorSlug'>): string {
  if (!route.creatorSlug) {
    return '/';
  }

  return route.strategy === 'path' ? `/store/${route.creatorSlug}` : '/';
}

export function buildStorePagePath(route: Pick<StoreRouteResolution, 'strategy' | 'creatorSlug'>, pageSlug: string): string {
  const homePath = buildStoreHomePath(route);
  return route.strategy === 'path' ? `${homePath}/${pageSlug}` : `/${pageSlug}`;
}

export function buildStoreProductPath(route: Pick<StoreRouteResolution, 'strategy' | 'creatorSlug'>, productSlug: string): string {
  const homePath = buildStoreHomePath(route);
  return route.strategy === 'path'
    ? `${homePath}/product/${productSlug}`
    : `/product/${productSlug}`;
}
