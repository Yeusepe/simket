/**
 * Purpose: Shared request and response types for the recommendation discovery
 * feed API.
 *
 * Governing docs:
 *   - docs/architecture.md (§2 pluggable recommenders, §6 discovery)
 *   - docs/service-architecture.md (§1.2 Recommend service API)
 *   - docs/domain-model.md (§4.1 Product, RecommendationProfile)
 * External references:
 *   - https://encore.dev/docs/ts/primitives/services-and-apis
 * Tests:
 *   - packages/recommend-service/src/discovery/discovery.service.test.ts
 */

export interface DiscoveryRequest {
  readonly userId: string;
  readonly cursor?: string;
  readonly pageSize: number;
  readonly excludeIds?: readonly string[];
}

export interface DiscoveryResponse {
  readonly items: readonly DiscoveryItem[];
  readonly nextCursor?: string;
  readonly totalEstimate: number;
}

export interface DiscoveryProductReference {
  readonly id: string;
}

export interface DiscoveryItem {
  readonly product: DiscoveryProductReference;
  readonly score: number;
  readonly reason: string;
  readonly source: string;
}
