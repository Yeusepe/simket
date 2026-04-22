/**
 * Purpose: Define creator-store domain types shared by routing, layout, and context hooks.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront, §5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject, StorePage, Product)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§6 state and data rules)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#product
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/store/StoreLayout.test.tsx
 *   - packages/storefront/src/store/routing.test.ts
 */
import type { PageSchema, ThemeOverrides } from '../builder';
import type { CreatorStoreProduct } from '../types/product';

export interface CreatorStoreTheme extends ThemeOverrides {
  readonly foregroundColor?: string;
}

export interface CreatorProfile {
  readonly id: string;
  readonly slug: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly tagline: string;
  readonly bio: string;
}

export interface CreatorStorePage {
  readonly slug: string;
  readonly title: string;
  readonly description?: string;
  readonly isHomepage?: boolean;
  readonly schema?: PageSchema | null;
}

export interface CreatorStore {
  readonly creator: CreatorProfile;
  readonly theme: CreatorStoreTheme;
  readonly pages: readonly CreatorStorePage[];
  readonly products: readonly CreatorStoreProduct[];
}
