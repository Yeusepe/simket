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
  readonly publishedAt: string;
  readonly slug: string;
  readonly tags: readonly string[];
}

export interface UseEditorialResult {
  readonly sections: readonly EditorialSection[];
  readonly isLoading: boolean;
  readonly error?: Error;
  readonly refetch: () => void;
}
