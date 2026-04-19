/**
 * Purpose: Shared vendure-server editorial integration contracts for cached
 * content, webhook payloads, sync updates, and search indexing.
 * Governing docs:
 *   - docs/architecture.md (§2 Cache-aside, delete-on-write; §9 Every outbound call through Cockatiel)
 *   - docs/service-architecture.md (§1.5 PayloadCMS API, §1.7 Svix)
 *   - docs/domain-model.md (§1 EditorialArticle, CuratedCollection, WebhookEndpoint, SearchDocument)
 * External references:
 *   - https://payloadcms.com/docs/rest-api/overview
 *   - https://typesense.org/docs/27.1/api/documents.html
 * Tests:
 *   - packages/vendure-server/src/features/editorial/editorial-cache.service.test.ts
 *   - packages/vendure-server/src/features/editorial/editorial-sync.service.test.ts
 *   - packages/vendure-server/src/features/editorial/editorial-webhook.router.test.ts
 */
import type { FeaturedProduct } from '@simket/editorial';

export type EditorialCollectionSlug = 'articles' | 'featured-products' | 'editorial-sections';

export type EditorialWebhookOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'unpublish';

export interface EditorialWebhookDocument {
  readonly id: string;
  readonly slug?: string;
  readonly title?: string;
  readonly excerpt?: string;
  readonly status?: string;
  readonly sectionId?: string;
  readonly publishedAt?: string;
  readonly tags?: readonly string[];
}

export interface EditorialWebhookEvent {
  readonly eventId: string;
  readonly collection: EditorialCollectionSlug;
  readonly operation: EditorialWebhookOperation;
  readonly occurredAt: string;
  readonly doc?: EditorialWebhookDocument;
  readonly previousDoc?: EditorialWebhookDocument;
}

export interface CuratedCollectionItem {
  readonly id: string;
  readonly title: string;
  readonly excerpt: string;
  readonly heroImage: string;
  readonly heroTransparent?: string;
  readonly author: string;
  readonly publishedAt: string;
  readonly slug: string;
  readonly tags: readonly string[];
  /** Mirrors Payload `spotlightEyebrow` — overrides section label in bento hero. */
  readonly spotlightEyebrow?: string;
  /** Optional line below the bento title (Payload `spotlightSubline`). */
  readonly spotlightSubline?: string;
  readonly spotlightPriceFormatted?: string;
  readonly hideSpotlightPrice?: boolean;
  readonly hideSpotlightCta?: boolean;
  readonly productName?: string;
  readonly creatorName?: string;
  readonly productThumbnailUrl?: string;
}

export interface CuratedCollection {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly layout: 'hero-banner' | 'card-grid-4' | 'card-grid-2' | 'horizontal-scroll';
  readonly sortOrder: number;
  readonly items: readonly CuratedCollectionItem[];
  readonly featuredProducts: readonly FeaturedProduct[];
}

export interface EditorialInvalidationResult {
  readonly keys: readonly string[];
  readonly patterns: readonly string[];
}

export interface EditorialArticleSearchDocument {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly author: string;
  readonly publishedAt: number;
  readonly tags: readonly string[];
  readonly sectionId?: string;
}

export interface EditorialUpdate {
  readonly version: number;
  readonly collection: EditorialCollectionSlug;
  readonly operation: EditorialWebhookOperation;
  readonly occurredAt: string;
  readonly receivedAt: string;
  readonly eventId: string;
  readonly affectedKeys: readonly string[];
  readonly affectedPatterns: readonly string[];
  readonly homepageFeedUpdated: boolean;
}

export interface EditorialUpdateStatus {
  readonly hasUpdate: boolean;
  readonly version: number;
  readonly update?: EditorialUpdate;
}
