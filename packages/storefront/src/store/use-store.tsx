/**
 * Purpose: Expose the active creator-store context to routed storefront components.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront, §5 Framely integration)
 *   - docs/service-architecture.md (§1 client features)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§2 explicit data flow)
 * External references:
 *   - https://reactrouter.com/start/framework/routing
 * Tests:
 *   - packages/storefront/src/store/StoreLayout.test.tsx
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { ProductDetail } from '../types/product';
import { buildStoreHomePath, buildStorePagePath, buildStoreProductPath, type StoreRouteResolution } from './routing';
import type { CreatorStore, CreatorStorePage } from './types';

export interface StoreContextValue {
  readonly store: CreatorStore;
  readonly resolution: StoreRouteResolution;
  readonly currentPage: CreatorStorePage | null;
  readonly currentProduct: ProductDetail | null;
  readonly hrefs: {
    readonly home: string;
    readonly page: (pageSlug: string) => string;
    readonly product: (productSlug: string) => string;
  };
}

const StoreContext = createContext<StoreContextValue | null>(null);

interface StoreProviderProps {
  readonly value: StoreContextValue;
  readonly children: ReactNode;
}

export function StoreProvider({ value, children }: StoreProviderProps) {
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function createStoreHrefs(resolution: StoreRouteResolution) {
  return {
    home: buildStoreHomePath(resolution),
    page: (pageSlug: string) => buildStorePagePath(resolution, pageSlug),
    product: (productSlug: string) => buildStoreProductPath(resolution, productSlug),
  } as const;
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error('useStore must be used inside a StoreProvider.');
  }

  return context;
}
