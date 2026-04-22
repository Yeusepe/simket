/**
 * Purpose: Home page shell with the editorial Today section followed by the
 * discovery feed placeholder.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/pages/HomePage.test.tsx
 */
import { useAuth } from '../auth/AuthProvider';
import { TodaySection } from '../components/today';
import { DiscoveryFeed } from '../components/discovery';
import type { DiscoveryFeedItem } from '../components/discovery/discovery-types';
import type { UseDiscoveryReturn } from '../components/discovery/use-discovery';
import { useTrendingProducts } from '../hooks/use-trending-products';

function useCatalogDiscovery(userId: string): UseDiscoveryReturn {
  void userId;
  const trendingProducts = useTrendingProducts();
  const discoveryItems: readonly DiscoveryFeedItem[] =
    trendingProducts.data?.map((product, index) => ({
      product,
      reason: index % 2 === 0 ? 'Popular with creator-store shoppers' : 'Trending this week',
      score: 100 - index,
      source: 'simket-catalog',
      variantId: `${product.id}-default`,
    })) ?? [];

  return {
    items: discoveryItems,
    isLoading: trendingProducts.isLoading,
    hasMore: false,
    error: trendingProducts.error instanceof Error ? trendingProducts.error : null,
    loadMore: async () => {},
    retry: async () => {},
    reset: async () => {},
  };
}

export function HomePage() {
  const { session } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
      {!session ? (
        <section
          aria-label="Marketplace welcome"
          className="mb-12 rounded-[2rem] border border-border/70 bg-surface-secondary px-6 py-8 sm:px-8 sm:py-10"
        >
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Public marketplace
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Discover creator-made digital goods
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              Browse featured releases, trending tools, and creator stores before you sign in.
              Your account is only needed for library, wishlist, notifications, checkout ownership,
              and creator workspace features.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="#today"
                className="inline-flex items-center rounded-full bg-[var(--simket-accent400)] px-5 py-2.5 text-sm font-semibold text-[var(--simket-bg)] transition-opacity hover:opacity-90"
              >
                Explore today&apos;s picks
              </a>
              <a
                href="/sign-in"
                className="inline-flex items-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-secondary"
              >
                Sign in to your account
              </a>
            </div>
          </div>
        </section>
      ) : null}

      <div id="today">
        <TodaySection />
      </div>

      <section aria-label="Discover" className="mt-16 space-y-6">
        <h2 className="text-2xl font-bold">Discover</h2>
        <DiscoveryFeed userId="catalog-user" useDiscoveryHook={useCatalogDiscovery} />
      </section>
    </div>
  );
}
