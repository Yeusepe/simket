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

import { MOCK_PRODUCTS } from '../mock-data';
import type { ProductListItem } from '../types/product';

const TRENDING_LIMIT = 12;

/**
 * Returns trending / popular products for the home carousel.
 * Currently serves catalog-shaped mock data; swap `queryFn` for shop GraphQL when wired.
 */
export function useTrendingProducts() {
  return useQuery({
    queryKey: ['trending-products'],
    queryFn: async (): Promise<readonly ProductListItem[]> =>
      [...MOCK_PRODUCTS].slice(0, TRENDING_LIMIT),
    staleTime: 60_000,
  });
}
