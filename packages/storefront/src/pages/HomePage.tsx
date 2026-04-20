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
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
      <TodaySection />

      <section aria-label="Discover" className="mt-16 space-y-6">
        <h2 className="text-2xl font-bold">Discover</h2>
        <DiscoveryFeed userId="catalog-user" useDiscoveryHook={useCatalogDiscovery} />
      </section>
    </div>
  );
}
