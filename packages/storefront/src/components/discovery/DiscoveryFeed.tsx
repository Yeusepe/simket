/**
 * Purpose: Render the discovery recommendation grid with product tiles (same shell layout as Today trending),
 * loading/error states, and IntersectionObserver-driven infinite scroll.
 *
 * Governing docs:
 *   - docs/architecture.md (§6 storefront discovery, §7 HeroUI everywhere)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/discovery/DiscoveryFeed.test.tsx
 */

import { useEffect, useRef } from 'react';
import { Button } from '@heroui/react';

import { DiscoveryCard, DiscoveryCardSkeleton } from './DiscoveryCard';
import { useDiscovery, type UseDiscoveryReturn } from './use-discovery';

export interface DiscoveryFeedProps {
  readonly userId: string;
  readonly useDiscoveryHook?: (userId: string) => UseDiscoveryReturn;
}

export function DiscoveryFeed({
  userId,
  useDiscoveryHook = useDiscovery,
}: DiscoveryFeedProps) {
  const {
    items,
    isLoading,
    hasMore,
    error,
    loadMore,
    retry,
  } = useDiscoveryHook(userId);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (
      !hasMore ||
      isLoading ||
      error !== null ||
      typeof window.IntersectionObserver === 'undefined'
    ) {
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      {
        rootMargin: '200px 0px',
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [error, hasMore, isLoading, loadMore]);

  if (error && items.length === 0) {
    return (
      <div className="space-y-3" role="alert">
        <p className="text-sm text-danger">{error.message}</p>
        <Button variant="secondary" onPress={() => void retry()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <DiscoveryCard key={item.productId} item={item} />
        ))}
        {isLoading && items.length === 0 && Array.from({ length: 4 }, (_, index) => (
          <DiscoveryCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>

      {error && items.length > 0 && (
        <div className="space-y-3" role="alert">
          <p className="text-sm text-danger">{error.message}</p>
          <Button variant="secondary" onPress={() => void retry()}>
            Retry
          </Button>
        </div>
      )}

      {!hasMore && items.length > 0 && !isLoading && (
        <p className="text-center text-sm text-muted-foreground">
          No more recommendations
        </p>
      )}

      <div ref={sentinelRef} aria-hidden="true" data-testid="discovery-feed-sentinel" />
    </div>
  );
}
