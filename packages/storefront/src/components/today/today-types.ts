/**
 * Purpose: Shared Today section models used by storefront editorial components
 * and data hooks.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://payloadcms.com/docs
 * Tests:
 *   - packages/storefront/src/components/today/use-editorial.test.ts
 *   - packages/storefront/src/components/today/TodaySection.test.tsx
 */

export const TODAY_LAYOUTS = [
  'hero-banner',
  'card-grid-4',
  'card-grid-2',
  'horizontal-scroll',
] as const;

export interface EditorialSection {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly layout: (typeof TODAY_LAYOUTS)[number];
  readonly sortOrder: number;
  readonly items: readonly EditorialItem[];
}

export interface EditorialItem {
  readonly id: string;
  readonly title: string;
  readonly excerpt: string;
  readonly heroImage: string;
  readonly heroTransparent?: string;
  readonly author: string;
  /** Spotlight footer: shown as the underlined creator line (defaults to `author`). */
  readonly creatorName?: string;
  /** Small square image in the bento footer (defaults to `heroImage`). */
  readonly productThumbnailUrl?: string;
  /** Spotlight footer primary line — product / listing name (defaults to `title`). */
  readonly productName?: string;
  /** Bento hero eyebrow; overrides the section name (Payload: `spotlightEyebrow`). */
  readonly spotlightEyebrow?: string;
  /** Optional line below the bento hero title (Payload: `spotlightSubline`). */
  readonly spotlightSubline?: string;
  /** Shown in CTA pill when price mode is on (Payload: `spotlightPriceFormatted`). */
  readonly spotlightPriceFormatted?: string;
  /** When true, CTA shows “Read more” instead of price (Payload: `hideSpotlightPrice`). */
  readonly hideSpotlightPrice?: boolean;
  /** When true, CTA pill is hidden (Payload: `hideSpotlightCta`). */
  readonly hideSpotlightCta?: boolean;
  readonly publishedAt: string;
  readonly slug: string;
  readonly tags: readonly string[];
}

export interface UseEditorialResult {
  readonly sections: readonly EditorialSection[];
  readonly isLoading: boolean;
  readonly error?: Error;
  readonly version: number;
  readonly hasFreshContent: boolean;
  readonly dismissFreshContent: () => void;
  readonly refetch: () => void;
}
