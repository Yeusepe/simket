/**
 * Purpose: PayloadCMS collection schema for editorial articles that power the
 * storefront Today hero and supporting product curation.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://payloadcms.com/docs
 * Tests:
 *   - packages/editorial/tests/articles.test.ts
 */

import type { CollectionConfig } from 'payload';

import { createAutoSlugField } from '../slug.js';

export const articlesCollection: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
  },
  defaultSort: '-publishedAt',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    createAutoSlugField({ sourceField: 'title' }),
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'heroTransparent',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'author',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: ['draft', 'published', 'archived'],
    },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
      defaultValue: [],
    },
    {
      name: 'featuredProducts',
      type: 'relationship',
      relationTo: 'featured-products',
      hasMany: true,
    },
    {
      name: 'section',
      type: 'relationship',
      relationTo: 'editorial-sections',
    },
  ],
};
