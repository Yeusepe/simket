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
import { MOCK_DISCOVERY_ITEMS } from '../mock-data';
import type { DiscoveryRequest, DiscoveryPage } from '../components/discovery/discovery-types';
import type { UseDiscoveryReturn } from '../components/discovery/use-discovery';

const PAGE_SIZE = 8;

function createMockDiscoveryHook(userId: string): UseDiscoveryReturn {
  // Return all mock items as a static discovery feed for dev
  void userId;
  return {
    items: MOCK_DISCOVERY_ITEMS,
    isLoading: false,
    hasMore: false,
    error: null,
    loadMore: async () => {},
    retry: async () => {},
    reset: async () => {},
  };
}

function isDevMode(): boolean {
  try {
    const env = (import.meta as ImportMeta & { readonly env?: Record<string, string | undefined> }).env;
    return env?.DEV === 'true' || env?.MODE === 'development';
  } catch {
    return false;
  }
}

export function HomePage() {
  const devMode = isDevMode();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <TodaySection />

      <section aria-label="Discover" className="mt-12">
        <h2 className="mb-6 text-2xl font-bold">Discover</h2>
        {devMode ? (
          <DiscoveryFeed
            userId="dev-user"
            useDiscoveryHook={createMockDiscoveryHook}
          />
        ) : (
          <p className="text-muted-foreground">
            Infinite scroll recommendations will appear here — powered by the
            pluggable recommendation pipeline.
          </p>
        )}
      </section>
    </div>
  );
}
