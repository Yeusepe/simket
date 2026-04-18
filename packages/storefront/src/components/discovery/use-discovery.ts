/**
 * Purpose: Fetch and manage paginated discovery feed state for the storefront
 * homepage.
 *
 * Governing docs:
 *   - docs/architecture.md (§6 storefront discovery)
 *   - docs/service-architecture.md (§1.2 Recommend service API)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://react.dev/reference/react/useEffect
 * Tests:
 *   - packages/storefront/src/components/discovery/use-discovery.test.ts
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  DiscoveryFeedItem,
  DiscoveryPage,
  DiscoveryRequest,
} from './discovery-types';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function clampPageSize(pageSize: number): number {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(pageSize, MAX_PAGE_SIZE);
}

function mergeItems(
  existing: readonly DiscoveryFeedItem[],
  incoming: readonly DiscoveryFeedItem[],
): DiscoveryFeedItem[] {
  const deduplicated = new Map<string, DiscoveryFeedItem>();

  for (const item of existing) {
    deduplicated.set(item.productId, item);
  }

  for (const item of incoming) {
    deduplicated.set(item.productId, item);
  }

  return [...deduplicated.values()];
}

async function fetchDiscoveryPage(request: DiscoveryRequest): Promise<DiscoveryPage> {
  const response = await fetch('/api/discovery', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Discovery request failed with status ${response.status}.`);
  }

  return (await response.json()) as DiscoveryPage;
}

export type DiscoveryFetcher = (
  request: DiscoveryRequest,
) => Promise<DiscoveryPage>;

export interface UseDiscoveryOptions {
  readonly fetcher?: DiscoveryFetcher;
  readonly pageSize?: number;
}

export interface UseDiscoveryReturn {
  readonly items: readonly DiscoveryFeedItem[];
  readonly isLoading: boolean;
  readonly hasMore: boolean;
  readonly error: Error | null;
  readonly loadMore: () => Promise<void>;
  readonly retry: () => Promise<void>;
  readonly reset: () => Promise<void>;
}

export function useDiscovery(
  userId: string,
  options: UseDiscoveryOptions = {},
): UseDiscoveryReturn {
  const fetcher = options.fetcher ?? fetchDiscoveryPage;
  const pageSize = clampPageSize(options.pageSize ?? DEFAULT_PAGE_SIZE);

  const [items, setItems] = useState<readonly DiscoveryFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const itemsRef = useRef<readonly DiscoveryFeedItem[]>([]);
  const cursorRef = useRef<string | undefined>(undefined);
  const requestedCursorRef = useRef<string | undefined>(undefined);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const loadPage = useCallback(
    async (cursor?: string, append = false): Promise<void> => {
      if (loadingRef.current) {
        return;
      }

      if (append && !hasMoreRef.current) {
        return;
      }

      if (userId.trim().length === 0) {
        setError(new Error('Discovery feed requires a non-empty userId.'));
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      loadingRef.current = true;
      requestedCursorRef.current = cursor;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetcher({
          userId,
          pageSize,
          cursor,
          excludeIds: append ? itemsRef.current.map((item) => item.productId) : [],
        });

        setItems((current) => {
          const nextItems = append ? mergeItems(current, response.items) : [...response.items];
          itemsRef.current = nextItems;
          return nextItems;
        });

        cursorRef.current = response.nextCursor;
        setHasMore(response.nextCursor !== undefined);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError
            : new Error(String(fetchError)),
        );
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [fetcher, pageSize, userId],
  );

  const reset = useCallback(async (): Promise<void> => {
    itemsRef.current = [];
    cursorRef.current = undefined;
    requestedCursorRef.current = undefined;
    hasMoreRef.current = true;
    setItems([]);
    setHasMore(true);
    setError(null);

    await loadPage(undefined, false);
  }, [loadPage]);

  useEffect(() => {
    void reset();
  }, [reset]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!cursorRef.current) {
      return;
    }

    await loadPage(cursorRef.current, true);
  }, [loadPage]);

  const retry = useCallback(async (): Promise<void> => {
    await loadPage(
      requestedCursorRef.current,
      itemsRef.current.length > 0 && requestedCursorRef.current !== undefined,
    );
  }, [loadPage]);

  return {
    items,
    isLoading,
    hasMore,
    error,
    loadMore,
    retry,
    reset,
  };
}
