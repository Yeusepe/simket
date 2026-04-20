/**
 * Purpose: Product list for the Today “Trending” horizontal row (shop catalog, not editorial).
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 * External references:
 *   - https://tanstack.com/query/latest
 * Tests:
 *   - packages/storefront/src/hooks/use-trending-products.test.tsx
 */
import { useQuery } from '@tanstack/react-query';
import type { ProductListItem } from '../types/product';
import { fetchCatalogProducts } from '../services/catalog-api';

const TRENDING_LIMIT = 12;

/**
 * Returns trending / popular products for the home carousel.
 * Dev-only: `queryFn` uses local fixtures — replace with the real catalog query in production.
 */
export function useTrendingProducts() {
  return useQuery({
    queryKey: ['trending-products'],
    queryFn: async (): Promise<readonly ProductListItem[]> =>
      fetchCatalogProducts(TRENDING_LIMIT),
    staleTime: 60_000,
  });
}
