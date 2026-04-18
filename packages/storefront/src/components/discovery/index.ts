/**
 * Purpose: Discovery feed exports for the storefront package.
 *
 * Governing docs:
 *   - docs/architecture.md (§6 storefront discovery)
 *   - docs/service-architecture.md (§1.2 Recommend service API)
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/discovery/DiscoveryFeed.test.tsx
 *   - packages/storefront/src/components/discovery/DiscoveryCard.test.tsx
 */

export { DiscoveryCard, DiscoveryCardSkeleton } from './DiscoveryCard';
export { DiscoveryFeed } from './DiscoveryFeed';
export type {
  DiscoveryFeedItem,
  DiscoveryPage,
  DiscoveryRequest,
} from './discovery-types';
export { useDiscovery } from './use-discovery';
export type {
  DiscoveryFetcher,
  UseDiscoveryOptions,
  UseDiscoveryReturn,
} from './use-discovery';
