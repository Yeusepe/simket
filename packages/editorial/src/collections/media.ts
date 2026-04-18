/**
 * Purpose: Media upload collection for editorial hero images referenced by
 * PayloadCMS articles and featured products.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://payloadcms.com/docs
 * Tests:
 *   - packages/editorial/tests/articles.test.ts
 *   - packages/editorial/tests/featured-products.test.ts
 */

import type { CollectionConfig } from 'payload';

export const mediaCollection: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      name: 'caption',
      type: 'textarea',
      maxLength: 500,
    },
  ],
  upload: {
    mimeTypes: ['image/*'],
    imageSizes: [
      {
        name: 'hero',
        width: 1600,
        height: 900,
        withoutEnlargement: true,
      },
    ],
  },
};
