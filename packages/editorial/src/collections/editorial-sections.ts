/**
 * Purpose: PayloadCMS collection schema for homepage editorial section groups
 * that control layout and ordering of Today content.
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

export const editorialSectionsCollection: CollectionConfig = {
  slug: 'editorial-sections',
  admin: {
    useAsTitle: 'name',
  },
  defaultSort: 'sortOrder',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      maxLength: 200,
    },
    createAutoSlugField({ sourceField: 'name' }),
    {
      name: 'description',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'layout',
      type: 'select',
      required: true,
      options: ['hero-banner', 'card-grid-4', 'card-grid-2', 'horizontal-scroll'],
    },
    {
      name: 'sortOrder',
      type: 'number',
      required: true,
      defaultValue: 0,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
};
