/**
 * Purpose: PayloadCMS collection schema for editorially curated Vendure product
 * picks shown in the homepage hero and supporting sections.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://payloadcms.com/docs
 * Tests:
 *   - packages/editorial/tests/featured-products.test.ts
 */

import type { CollectionConfig } from 'payload';

export const featuredProductsCollection: CollectionConfig = {
  slug: 'featured-products',
  admin: {
    useAsTitle: 'productId',
  },
  defaultSort: 'priority',
  fields: [
    {
      name: 'productId',
      type: 'text',
      required: true,
    },
    {
      name: 'displayTitle',
      type: 'text',
      maxLength: 200,
    },
    {
      name: 'displayDescription',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'heroTransparent',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'priority',
      type: 'number',
      required: true,
      min: 1,
      max: 100,
      defaultValue: 50,
    },
    {
      name: 'startDate',
      type: 'date',
    },
    {
      name: 'endDate',
      type: 'date',
    },
  ],
};
