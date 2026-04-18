/**
 * Purpose: Custom hook for fetching paginated product listings.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 *   - docs/service-architecture.md (Cache-aside reads)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/queries/#products
 *   - https://docs.vendure.io/reference/graphql-api/shop/queries/#search
 * Tests:
 *   - packages/storefront/src/hooks/use-product-listing.test.ts
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ProductListItem,
  ProductListingParams,
  ProductListingResponse,
  ProductSortOption,
  ProductFilters,
  FacetGroup,
  PaginatedList,
} from '../types/product';
import { DEFAULT_PER_PAGE, DEFAULT_SORT } from '../types/product';

export interface UseProductListingReturn {
  /** Current page of product results. */
  readonly products: PaginatedList<ProductListItem>;
  /** Facet groups for filter sidebar. */
  readonly facets: readonly FacetGroup[];
  /** Whether a fetch is in-flight. */
  readonly isLoading: boolean;
  /** Error from the last fetch, if any. */
  readonly error: Error | null;
  /** Current page number (1-based). */
  readonly page: number;
  /** Total number of pages. */
  readonly totalPages: number;
  /** Navigate to a specific page. */
  readonly setPage: (page: number) => void;
  /** Update sort option. */
  readonly setSort: (sort: ProductSortOption) => void;
  /** Update filters (merges with existing). */
  readonly setFilters: (filters: ProductFilters) => void;
  /** Current sort option. */
  readonly sort: ProductSortOption;
  /** Current active filters. */
  readonly filters: ProductFilters;
}

/** Function type for the API fetcher — injected for testability. */
export type ProductListingFetcher = (
  params: ProductListingParams,
) => Promise<ProductListingResponse>;

const EMPTY_PRODUCTS: PaginatedList<ProductListItem> = { items: [], totalItems: 0 };
const EMPTY_FACETS: readonly FacetGroup[] = [];

export interface UseProductListingOptions {
  /** Fetcher function — injected so tests can provide a mock. */
  readonly fetcher: ProductListingFetcher;
  /** Initial page (1-based). Default: 1. */
  readonly initialPage?: number;
  /** Items per page. Default: DEFAULT_PER_PAGE. */
  readonly perPage?: number;
  /** Initial sort. Default: DEFAULT_SORT. */
  readonly initialSort?: ProductSortOption;
  /** Initial filters. Default: empty. */
  readonly initialFilters?: ProductFilters;
}

export function useProductListing(options: UseProductListingOptions): UseProductListingReturn {
  const {
    fetcher,
    initialPage = 1,
    perPage = DEFAULT_PER_PAGE,
    initialSort = DEFAULT_SORT,
    initialFilters = {},
  } = options;

  const [products, setProducts] = useState<PaginatedList<ProductListItem>>(EMPTY_PRODUCTS);
  const [facets, setFacets] = useState<readonly FacetGroup[]>(EMPTY_FACETS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(initialPage);
  const [sort, setSort] = useState<ProductSortOption>(initialSort);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);

  // Abort controller for in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  const fetchProducts = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetcher({ page, perPage, sort, filters });

      // Don't update state if this request was cancelled
      if (controller.signal.aborted) return;

      setProducts(response.products);
      setFacets(response.facets);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [fetcher, page, perPage, sort, filters]);

  useEffect(() => {
    fetchProducts();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchProducts]);

  // Reset to page 1 when sort or filters change
  const handleSetSort = useCallback((newSort: ProductSortOption) => {
    setSort(newSort);
    setPage(1);
  }, []);

  const handleSetFilters = useCallback((newFilters: ProductFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(products.totalItems / perPage));

  return {
    products,
    facets,
    isLoading,
    error,
    page,
    totalPages,
    setPage,
    setSort: handleSetSort,
    setFilters: handleSetFilters,
    sort,
    filters,
  };
}
