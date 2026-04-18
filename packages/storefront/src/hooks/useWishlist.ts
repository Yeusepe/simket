/**
 * Purpose: Fetch, cache, and optimistically mutate storefront wishlist state through Vendure's shop API.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - https://developer.mozilla.org/docs/Web/API/Fetch_API
 *   - https://tanstack.com/query/latest/docs/framework/react/overview
 * Tests:
 *   - packages/storefront/src/hooks/useWishlist.test.tsx
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { ProductListItem } from '../types/product';
import type { WishlistApi, WishlistItem, WishlistPage } from '../types/wishlist';

interface GraphqlError {
  readonly message: string;
}

interface GraphqlResponse<TData> {
  readonly data?: TData;
  readonly errors?: readonly GraphqlError[];
}

export interface UseWishlistOptions {
  readonly api?: WishlistApi;
  readonly page?: number;
  readonly limit?: number;
  readonly productId?: string;
}

export interface UseWishlistResult {
  readonly wishlist: WishlistPage;
  readonly wishlistCount: number;
  readonly currentProductInWishlist: boolean;
  readonly isLoading: boolean;
  readonly isMutating: boolean;
  readonly error: Error | null;
  readonly isInWishlist: (productId: string) => boolean;
  readonly addToWishlist: (productId: string, notifyOnPriceDrop?: boolean) => Promise<void>;
  readonly removeFromWishlist: (productId: string) => Promise<void>;
  readonly toggleWishlist: (productId: string, notifyOnPriceDrop?: boolean) => Promise<void>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const EMPTY_WISHLIST: WishlistPage = {
  items: [],
  totalItems: 0,
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
};

const LIST_WISHLIST_QUERY = `
  query Wishlist($page: Int!, $limit: Int!) {
    wishlist(page: $page, limit: $limit) {
      items {
        id
        customerId
        productId
        addedAt
        notifyOnPriceDrop
        product {
          id
          slug
          name
          description
          priceMin
          priceMax
          currencyCode
          heroImageUrl
          heroTransparentUrl
          creatorName
          tags
          categorySlug
        }
      }
      totalItems
      page
      limit
    }
  }
`;

const WISHLIST_COUNT_QUERY = `
  query WishlistCount {
    wishlistCount
  }
`;

const IS_IN_WISHLIST_QUERY = `
  query IsInWishlist($productId: ID!) {
    isInWishlist(productId: $productId)
  }
`;

const ADD_TO_WISHLIST_MUTATION = `
  mutation AddToWishlist($productId: ID!, $notifyOnPriceDrop: Boolean) {
    addToWishlist(productId: $productId, notifyOnPriceDrop: $notifyOnPriceDrop) {
      id
      customerId
      productId
      addedAt
      notifyOnPriceDrop
      product {
        id
        slug
        name
        description
        priceMin
        priceMax
        currencyCode
        heroImageUrl
        heroTransparentUrl
        creatorName
        tags
        categorySlug
      }
    }
  }
`;

const REMOVE_FROM_WISHLIST_MUTATION = `
  mutation RemoveFromWishlist($productId: ID!) {
    removeFromWishlist(productId: $productId)
  }
`;

function createWishlistKeys(page: number, limit: number) {
  return {
    page: ['wishlist', 'page', page, limit] as const,
    count: ['wishlist', 'count'] as const,
    contains: (productId: string) => ['wishlist', 'contains', productId] as const,
  };
}

function getShopApiUrl(): string {
  const configuredUrl = (import.meta as ImportMeta & {
    readonly env?: Record<string, string | undefined>;
  }).env?.VITE_SIMKET_SHOP_API_URL;
  if (typeof configuredUrl === 'string' && configuredUrl.length > 0) {
    return configuredUrl;
  }

  return new URL('/shop-api', window.location.origin).toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProductListItem(value: unknown): value is ProductListItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.priceMin === 'number' &&
    typeof value.priceMax === 'number' &&
    typeof value.currencyCode === 'string' &&
    (value.heroImageUrl === null || typeof value.heroImageUrl === 'string') &&
    (value.heroTransparentUrl === null || typeof value.heroTransparentUrl === 'string') &&
    typeof value.creatorName === 'string' &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string') &&
    (value.categorySlug === null || typeof value.categorySlug === 'string')
  );
}

function isWishlistItem(value: unknown): value is WishlistItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.customerId === 'string' &&
    typeof value.productId === 'string' &&
    typeof value.addedAt === 'string' &&
    typeof value.notifyOnPriceDrop === 'boolean' &&
    isProductListItem(value.product)
  );
}

function isWishlistPage(value: unknown): value is WishlistPage {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isWishlistItem) &&
    typeof value.totalItems === 'number' &&
    typeof value.page === 'number' &&
    typeof value.limit === 'number'
  );
}

async function fetchShopGraphql<TData>(
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> {
  const response = await globalThis.fetch(getShopApiUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Wishlist request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GraphqlResponse<TData>;
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0]?.message ?? 'Wishlist request failed.');
  }
  if (!payload.data) {
    throw new Error('Wishlist response did not include data.');
  }

  return payload.data;
}

export function createWishlistApi(): WishlistApi {
  return {
    async listWishlist(request) {
      const data = await fetchShopGraphql<{ wishlist: unknown }>(LIST_WISHLIST_QUERY, request);
      if (!isWishlistPage(data.wishlist)) {
        throw new Error('Invalid wishlist response.');
      }

      return data.wishlist;
    },
    async getWishlistCount() {
      const data = await fetchShopGraphql<{ wishlistCount: unknown }>(WISHLIST_COUNT_QUERY, {});
      if (typeof data.wishlistCount !== 'number') {
        throw new Error('Invalid wishlist count response.');
      }

      return data.wishlistCount;
    },
    async isInWishlist(productId: string) {
      const data = await fetchShopGraphql<{ isInWishlist: unknown }>(IS_IN_WISHLIST_QUERY, { productId });
      if (typeof data.isInWishlist !== 'boolean') {
        throw new Error('Invalid wishlist membership response.');
      }

      return data.isInWishlist;
    },
    async addToWishlist(input) {
      const data = await fetchShopGraphql<{ addToWishlist: unknown }>(ADD_TO_WISHLIST_MUTATION, input);
      if (!isWishlistItem(data.addToWishlist)) {
        throw new Error('Invalid add-to-wishlist response.');
      }

      return data.addToWishlist;
    },
    async removeFromWishlist(productId: string) {
      const data = await fetchShopGraphql<{ removeFromWishlist: unknown }>(REMOVE_FROM_WISHLIST_MUTATION, { productId });
      if (typeof data.removeFromWishlist !== 'boolean') {
        throw new Error('Invalid remove-from-wishlist response.');
      }

      return data.removeFromWishlist;
    },
  };
}

export function useWishlist(options: UseWishlistOptions = {}): UseWishlistResult {
  const page = options.page ?? DEFAULT_PAGE;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const api = useMemo(() => options.api ?? createWishlistApi(), [options.api]);
  const queryClient = useQueryClient();
  const keys = createWishlistKeys(page, limit);

  const pageQuery = useQuery({
    queryKey: keys.page,
    queryFn: () => api.listWishlist({ page, limit }),
    enabled: options.page !== undefined || options.limit !== undefined,
    initialData: (options.page !== undefined || options.limit !== undefined)
      ? { ...EMPTY_WISHLIST, page, limit }
      : undefined,
    retry: false,
  });

  const countQuery = useQuery({
    queryKey: keys.count,
    queryFn: () => api.getWishlistCount(),
    initialData: 0,
    retry: false,
  });

  const membershipQuery = useQuery({
    queryKey: keys.contains(options.productId ?? ''),
    queryFn: () => api.isInWishlist(options.productId!),
    enabled: Boolean(options.productId),
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: (input: { readonly productId: string; readonly notifyOnPriceDrop: boolean }) =>
      api.addToWishlist(input),
    onMutate: async ({ productId }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: keys.count }),
        queryClient.cancelQueries({ queryKey: keys.page }),
        queryClient.cancelQueries({ queryKey: keys.contains(productId) }),
      ]);

      const previousCount = queryClient.getQueryData<number>(keys.count) ?? 0;
      const previousPage = queryClient.getQueryData<WishlistPage>(keys.page);
      const previousContains = queryClient.getQueryData<boolean>(keys.contains(productId));
      const alreadyInWishlist = previousContains
        ?? previousPage?.items.some((item) => item.productId === productId)
        ?? false;

      queryClient.setQueryData(keys.count, alreadyInWishlist ? previousCount : previousCount + 1);
      queryClient.setQueryData(keys.contains(productId), true);
      if (previousPage && !alreadyInWishlist) {
        queryClient.setQueryData(keys.page, {
          ...previousPage,
          totalItems: previousPage.totalItems + 1,
        } satisfies WishlistPage);
      }

      return { previousCount, previousPage, previousContains, alreadyInWishlist };
    },
    onError: (_error, variables, context) => {
      queryClient.setQueryData(keys.count, context?.previousCount ?? 0);
      queryClient.setQueryData(keys.page, context?.previousPage);
      queryClient.setQueryData(keys.contains(variables.productId), context?.previousContains);
    },
    onSuccess: (item, variables, context) => {
      queryClient.setQueryData(keys.contains(variables.productId), true);
      queryClient.setQueryData(keys.page, (current?: WishlistPage) => {
        if (!current) {
          return current;
        }

        const items = [item, ...current.items.filter((entry) => entry.productId !== variables.productId)]
          .slice(0, current.limit);

        return {
          ...current,
          items,
          totalItems: context?.alreadyInWishlist ? current.totalItems : Math.max(current.totalItems, items.length),
        } satisfies WishlistPage;
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.removeFromWishlist(productId),
    onMutate: async (productId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: keys.count }),
        queryClient.cancelQueries({ queryKey: keys.page }),
        queryClient.cancelQueries({ queryKey: keys.contains(productId) }),
      ]);

      const previousCount = queryClient.getQueryData<number>(keys.count) ?? 0;
      const previousPage = queryClient.getQueryData<WishlistPage>(keys.page);
      const previousContains = queryClient.getQueryData<boolean>(keys.contains(productId));
      const wasInWishlist = previousContains
        ?? previousPage?.items.some((item) => item.productId === productId)
        ?? false;

      queryClient.setQueryData(keys.count, wasInWishlist ? Math.max(0, previousCount - 1) : previousCount);
      queryClient.setQueryData(keys.contains(productId), false);
      if (previousPage && wasInWishlist) {
        queryClient.setQueryData(keys.page, {
          ...previousPage,
          items: previousPage.items.filter((item) => item.productId !== productId),
          totalItems: Math.max(0, previousPage.totalItems - 1),
        } satisfies WishlistPage);
      }

      return { previousCount, previousPage, previousContains };
    },
    onError: (_error, productId, context) => {
      queryClient.setQueryData(keys.count, context?.previousCount ?? 0);
      queryClient.setQueryData(keys.page, context?.previousPage);
      queryClient.setQueryData(keys.contains(productId), context?.previousContains);
    },
    onSuccess: (_removed, productId) => {
      queryClient.setQueryData(keys.contains(productId), false);
    },
  });

  const isInWishlist = useCallback((productId: string) => {
    const cached = queryClient.getQueryData<boolean>(keys.contains(productId));
    if (typeof cached === 'boolean') {
      return cached;
    }

    return pageQuery.data?.items.some((item) => item.productId === productId) ?? false;
  }, [keys, pageQuery.data, queryClient]);

  const addToWishlist = useCallback(async (productId: string, notifyOnPriceDrop = false) => {
    await addMutation.mutateAsync({ productId, notifyOnPriceDrop });
  }, [addMutation]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    await removeMutation.mutateAsync(productId);
  }, [removeMutation]);

  const toggleWishlist = useCallback(async (productId: string, notifyOnPriceDrop = false) => {
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
      return;
    }

    await addToWishlist(productId, notifyOnPriceDrop);
  }, [addToWishlist, isInWishlist, removeFromWishlist]);

  return {
    wishlist: pageQuery.data ?? { ...EMPTY_WISHLIST, page, limit },
    wishlistCount: countQuery.data ?? 0,
    currentProductInWishlist: options.productId ? isInWishlist(options.productId) : false,
    isLoading: pageQuery.isLoading || countQuery.isLoading || membershipQuery.isLoading,
    isMutating: addMutation.isPending || removeMutation.isPending,
    error:
      (pageQuery.error as Error | null)
      ?? (countQuery.error as Error | null)
      ?? (membershipQuery.error as Error | null)
      ?? (addMutation.error as Error | null)
      ?? (removeMutation.error as Error | null)
      ?? null,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
  };
}
