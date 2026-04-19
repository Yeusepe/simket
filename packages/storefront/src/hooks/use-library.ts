/**
 * Purpose: Hook to fetch the buyer's purchased product library from Vendure.
 * Governing docs:
 *   - docs/architecture.md (§4 Vendure core — order/entitlement system)
 *   - docs/domain-model.md (Order entity)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/queries/#active-customer
 * Tests:
 *   - packages/storefront/src/hooks/use-library.test.ts
 */
import { useCallback, useEffect, useState } from 'react';
import type { ProductListItem } from '../types/product';

export interface LibraryItem {
  readonly orderId: string;
  readonly orderDate: string;
  readonly product: ProductListItem;
}

export interface LibraryState {
  readonly items: readonly LibraryItem[];
  readonly totalItems: number;
  readonly page: number;
  readonly limit: number;
}

export interface LibraryApi {
  fetchLibrary(page: number, limit: number): Promise<LibraryState>;
}

const EMPTY_STATE: LibraryState = {
  items: [],
  totalItems: 0,
  page: 1,
  limit: 12,
};

interface UseLibraryOptions {
  readonly api?: LibraryApi;
  readonly page?: number;
  readonly limit?: number;
}

export function useLibrary({ api, page = 1, limit = 12 }: UseLibraryOptions = {}) {
  const [library, setLibrary] = useState<LibraryState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPage = useCallback(
    async (p: number) => {
      if (!api) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.fetchLibrary(p, limit);
        setLibrary(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    },
    [api, limit],
  );

  useEffect(() => {
    void fetchPage(page);
  }, [fetchPage, page]);

  return { library, isLoading, error, refetch: () => fetchPage(page) };
}
