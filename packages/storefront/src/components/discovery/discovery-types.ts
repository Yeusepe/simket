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

export interface DiscoveryRequest {
  readonly userId: string;
  readonly cursor?: string;
  readonly pageSize: number;
  readonly excludeIds?: readonly string[];
}

export interface DiscoveryFeedItem {
  readonly productId: string;
  readonly slug: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly price: number;
  readonly currencyCode: string;
  readonly creatorName: string;
  readonly reason: string;
  readonly score: number;
  readonly source: string;
  readonly variantId: string;
  /** Optional CSS accent when the feed API provides a per-item tint (e.g. discovery stripe). */
  readonly previewColor?: string | null;
}

export interface DiscoveryPage {
  readonly items: readonly DiscoveryFeedItem[];
  readonly nextCursor?: string;
  readonly totalEstimate: number;
}
