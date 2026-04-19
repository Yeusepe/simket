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
    {
      name: 'spotlightEyebrow',
      type: 'text',
      maxLength: 120,
      admin: {
        description:
          'Homepage bento hero: eyebrow above the title (e.g. FEATURED). Overrides the section name when set.',
      },
    },
    {
      name: 'spotlightSubline',
      type: 'text',
      maxLength: 200,
      admin: {
        description:
          'Homepage bento hero: optional small line below the article title (e.g. tagline). Leave empty to hide.',
      },
    },
    {
      name: 'spotlightPriceFormatted',
      type: 'text',
      maxLength: 64,
      admin: {
        description: 'Shown in the white pill (e.g. €35.00+). Leave empty to use “Read more” as the label.',
      },
    },
    {
      name: 'hideSpotlightPrice',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'If enabled, the pill shows “Read more” instead of the price string.',
      },
    },
    {
      name: 'hideSpotlightCta',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'If enabled, the white CTA pill is hidden.' },
    },
    {
      name: 'productName',
      type: 'text',
      maxLength: 200,
      admin: { description: 'Bento footer: product / listing name (bold line).' },
    },
    {
      name: 'creatorName',
      type: 'text',
      maxLength: 200,
      admin: { description: 'Bento footer: creator name (underlined link).' },
    },
    {
      name: 'productThumbnail',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Bento footer: square product image (rounded corners).' },
    },
  ],
};
