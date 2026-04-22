/**
 * Purpose: Fetch creator-store configuration, apply theme variables, and provide store context for nested routed pages.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront, §5 Framely integration)
 *   - docs/service-architecture.md (§1 client features)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§2 explicit data flow, §3 failures)
 * External references:
 *   - https://reactrouter.com/start/framework/routing
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/store/StoreLayout.test.tsx
 *   - packages/storefront/src/App.test.tsx
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { resolveStoreRoute } from './routing';
import { liveStoreService, type StoreService } from './store-service';
import { StoreNotFoundPage } from './StoreNotFoundPage';
import type { CreatorStore } from './types';
import { createStoreHrefs, StoreProvider } from './use-store';
import { useAdaptiveColors } from '../color';

type StoreThemeStyle = CSSProperties & {
  '--store-font-family'?: string;
  '--store-border-radius'?: string;
};

function buildStoreThemeStyle(store: CreatorStore): StoreThemeStyle {
  return {
    '--store-font-family': store.theme.fontFamily,
    '--store-border-radius': store.theme.borderRadius,
  };
}

interface StoreLayoutProps {
  readonly hostname?: string;
  readonly storeService?: StoreService;
}

export function StoreLayout({
  hostname,
  storeService = liveStoreService,
}: StoreLayoutProps) {
  const location = useLocation();
  const params = useParams<{
    creatorSlug?: string;
    pageSlug?: string;
    productSlug?: string;
  }>();
  const resolution = resolveStoreRoute({
    hostname: hostname ?? window.location.hostname,
    pathname: location.pathname,
    params,
  });
  const [store, setStore] = useState<CreatorStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!resolution.creatorSlug || resolution.routeKind === 'invalid') {
      setStore(null);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);

    storeService.getStoreBySlug(resolution.creatorSlug).then((nextStore) => {
      if (cancelled) {
        return;
      }

      setStore(nextStore);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [resolution.creatorSlug, resolution.routeKind, storeService]);

  const currentPage = useMemo(() => {
    if (!store) {
      return null;
    }

    if (resolution.routeKind === 'home') {
      return store.pages.find((page) => page.isHomepage) ?? null;
    }

    if (resolution.routeKind === 'page' && resolution.pageSlug) {
      return store.pages.find((page) => page.slug === resolution.pageSlug) ?? null;
    }

    return null;
  }, [resolution.pageSlug, resolution.routeKind, store]);

  const currentProduct = useMemo(() => {
    if (!store || resolution.routeKind !== 'product' || !resolution.productSlug) {
      return null;
    }

    return store.products.find((product) => product.slug === resolution.productSlug) ?? null;
  }, [resolution.productSlug, resolution.routeKind, store]);

  // Leonardo adaptive palette — must be called unconditionally (React hook rules)
  useAdaptiveColors({
    mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    primaryColor: store?.theme.primaryColor ?? '#7C3AED',
    backgroundColor: store?.theme.backgroundColor,
    prefix: 'store',
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Loading store…
      </div>
    );
  }

  if (!resolution.creatorSlug || resolution.routeKind === 'invalid' || !store) {
    return (
      <StoreNotFoundPage
        message={`We could not find a creator store for "${resolution.creatorSlug ?? 'this route'}".`}
      />
    );
  }

  const hrefs = createStoreHrefs(resolution);

  return (
    <StoreProvider
      value={{
        store,
        resolution,
        currentPage,
        currentProduct,
        hrefs,
      }}
    >
      <div
        data-testid="store-layout"
        style={buildStoreThemeStyle(store)}
        className="min-h-dvh bg-[var(--store-bg,#09090b)] text-[var(--store-fg,#f8fafc)] [font-family:var(--store-font-family,inherit)]"
      >
        <header className="border-b border-white/10 bg-black/10 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5">
            <div className="space-y-1">
              <Link to={hrefs.home} className="text-2xl font-semibold">
                {store.creator.displayName}
              </Link>
              <p className="text-sm text-white/70">{store.creator.tagline}</p>
            </div>
            <nav className="flex flex-wrap items-center gap-4 text-sm">
              {store.pages.map((page) => (
                <Link
                  key={page.slug}
                  to={page.isHomepage ? hrefs.home : hrefs.page(page.slug)}
                  className="text-white/80 transition hover:text-white"
                >
                  {page.title}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-10">
          <Outlet />
        </main>
      </div>
    </StoreProvider>
  );
}
