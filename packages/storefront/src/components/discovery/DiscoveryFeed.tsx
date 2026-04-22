/**
 * Purpose: Render the discovery recommendation grid with a product-first spotlight,
 * resilient empty/error states, and IntersectionObserver-driven infinite scroll.
 *
 * Governing docs:
 *   - docs/architecture.md (§6 storefront discovery, §7 HeroUI everywhere)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/carousel
 * Tests:
 *   - packages/storefront/src/components/discovery/DiscoveryFeed.test.tsx
 */
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Surface } from '@heroui/react';
import { Carousel } from '@heroui-pro/react/carousel';
import { EmptyState } from '@heroui-pro/react/empty-state';

import { Icon } from '../common/Icon';
import { TrendingProductCard } from '../today/TrendingProductCard';
import { DiscoveryCard, DiscoveryCardSkeleton } from './DiscoveryCard';
import { useDiscovery, type UseDiscoveryReturn } from './use-discovery';

export interface DiscoveryFeedProps {
  readonly userId: string;
  readonly useDiscoveryHook?: (userId: string) => UseDiscoveryReturn;
}

const DISCOVERY_SPOTLIGHT_LIMIT = 5;
const CAROUSEL_NAVIGATION_BUTTON_CLASS =
  'transition-opacity data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-0';

export function DiscoveryFeed({
  userId,
  useDiscoveryHook = useDiscovery,
}: DiscoveryFeedProps) {
  const navigate = useNavigate();
  const {
    items,
    isLoading,
    hasMore,
    error,
    loadMore,
    retry,
  } = useDiscoveryHook(userId);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const spotlightItems = useMemo(
    () => items.slice(0, DISCOVERY_SPOTLIGHT_LIMIT),
    [items],
  );

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
      <EmptyState
        aria-live="polite"
        className="rounded-[2rem] border border-danger/20 bg-danger/5"
        role="alert"
        size="lg"
      >
        <EmptyState.Header>
          <EmptyState.Media variant="icon">
            <Icon name="notifications" size={22} />
          </EmptyState.Media>
          <EmptyState.Title>Recommendations are unavailable</EmptyState.Title>
          <EmptyState.Description>{error.message}</EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content>
          <Button variant="secondary" onPress={() => void retry()}>
            Retry
          </Button>
        </EmptyState.Content>
      </EmptyState>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <EmptyState className="rounded-[2rem] border border-border/70 bg-surface-secondary" size="lg">
        <EmptyState.Header>
          <EmptyState.Media variant="icon">
            <Icon name="search" size={22} />
          </EmptyState.Media>
          <EmptyState.Title>No recommendations yet</EmptyState.Title>
          <EmptyState.Description>
            Interact with products, creators, or tags and the discovery rail will start adapting.
          </EmptyState.Description>
        </EmptyState.Header>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <Surface variant="secondary" className="rounded-[2rem] p-5 sm:p-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-foreground">
                FOR YOU
              </span>
              <div className="space-y-2">
                <h3 className="max-w-3xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Picked to help you find your next favorite product
                </h3>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  A tighter mix of worlds, avatars, tools, and packs worth opening right now,
                  with the spotlight staying on the products themselves.
                </p>
              </div>
            </div>

            {spotlightItems.length > 0 && (
              <Carousel
                className="storefront-product-carousel space-y-5 pt-2"
                opts={{ align: 'start', loop: spotlightItems.length > 1 }}
              >
                <Carousel.Content
                  data-testid="discovery-spotlight-track"
                  className="carousel__content--horizontal items-stretch"
                >
                  {spotlightItems.map((item) => (
                    <Carousel.Item
                      key={item.product.id}
                      className="carousel__item--horizontal basis-full xl:basis-[78%]"
                    >
                      <Card className="h-full overflow-hidden rounded-[2rem] border-border/60 shadow-none">
                        <Card.Content className="grid h-full gap-6 p-5 lg:grid-cols-[minmax(0,18rem)_1fr] lg:p-6">
                          <TrendingProductCard
                            articleClassName="w-full max-w-sm lg:max-w-none"
                            product={item.product}
                            showWishlistButton={false}
                          />
                          <div className="flex flex-col justify-between gap-6 py-1">
                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-foreground">
                                From {item.product.creatorName}
                              </p>
                              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                                {item.product.description}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <Button
                                variant="secondary"
                                onPress={() => navigate(`/product/${item.product.slug}`)}
                              >
                                View product
                              </Button>
                            </div>
                          </div>
                        </Card.Content>
                      </Card>
                    </Carousel.Item>
                  ))}
                </Carousel.Content>

                {spotlightItems.length > 1 && (
                  <>
                    <Carousel.Previous
                      aria-label="Previous discovery spotlight"
                      className={CAROUSEL_NAVIGATION_BUTTON_CLASS}
                      variant="outline"
                      icon={<Icon name="arrow-left" size={16} />}
                    />
                    <Carousel.Next
                      aria-label="Next discovery spotlight"
                      className={CAROUSEL_NAVIGATION_BUTTON_CLASS}
                      variant="outline"
                      icon={<Icon name="arrow-right" size={16} />}
                    />
                    <Carousel.Dots className="mt-0 pt-1" />
                  </>
                )}
              </Carousel>
            )}
          </div>
        </Surface>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <DiscoveryCard key={item.product.id} item={item} />
        ))}
        {isLoading && items.length === 0 && Array.from({ length: 4 }, (_, index) => (
          <DiscoveryCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>

      {error && items.length > 0 && (
        <EmptyState
          aria-live="polite"
          className="rounded-2xl border border-danger/20 bg-danger/5"
          role="alert"
          size="sm"
        >
          <EmptyState.Header>
            <EmptyState.Title>Couldn&apos;t refresh the next batch</EmptyState.Title>
            <EmptyState.Description>{error.message}</EmptyState.Description>
          </EmptyState.Header>
          <EmptyState.Content>
            <Button variant="secondary" onPress={() => void retry()}>
              Retry
            </Button>
          </EmptyState.Content>
        </EmptyState>
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
