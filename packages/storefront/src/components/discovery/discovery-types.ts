/**
 * Purpose: Client-side discovery feed types shared by the hook and HeroUI
 * discovery components.
 *
 * Governing docs:
 *   - docs/architecture.md (§6 storefront discovery)
 *   - docs/domain-model.md (§4.1 Product)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#product
 * Tests:
 *   - packages/storefront/src/components/discovery/DiscoveryCard.test.tsx
 *   - packages/storefront/src/components/discovery/use-discovery.test.ts
 */

import type { ProductListItem } from '../../types/product';

export interface DiscoveryRequest {
  readonly userId: string;
  readonly cursor?: string;
  readonly pageSize: number;
  readonly excludeIds?: readonly string[];
}

export interface DiscoveryFeedItem {
  readonly product: ProductListItem;
  readonly reason: string;
  readonly score: number;
  readonly source: string;
  readonly variantId: string;
}

export interface DiscoveryPage {
  readonly items: readonly DiscoveryFeedItem[];
  readonly nextCursor?: string;
  readonly totalEstimate: number;
}
