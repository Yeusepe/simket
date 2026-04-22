/**
 * Purpose: Provide default Framely page schemas for creator store-home and
 *          product detail customization flows.
 * Governing docs:
 *   - docs/architecture.md (§5 Framely integration)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/use-storefront-pages.test.ts
 */
import { createPageSchema, type PageSchema } from './types';

export function createDefaultStoreHomePageSchema(): PageSchema {
  return createPageSchema({
    blocks: [
      {
        id: 'store-profile-default',
        type: 'store-profile',
        props: {},
      },
      {
        id: 'store-catalog-default',
        type: 'store-catalog',
        props: {},
      },
    ],
  });
}

export function createDefaultProductPageSchema(): PageSchema {
  return createPageSchema({
    blocks: [
      {
        id: 'product-detail-default',
        type: 'product-detail',
        props: {},
      },
    ],
  });
}
