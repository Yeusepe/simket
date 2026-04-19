/**
 * Purpose: Verify article and editorial-section collection contracts, slug generation,
 * and article response validation for the PayloadCMS editorial integration.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://payloadcms.com/docs
 *   - https://github.com/payloadcms/payload
 * Tests:
 *   - packages/editorial/tests/articles.test.ts
 */

import { describe, expect, it } from 'vitest';

import { articlesCollection } from '../src/collections/articles.js';
import { editorialSectionsCollection } from '../src/collections/editorial-sections.js';
import {
  isArticle,
  isEditorialSection,
  parsePaginatedCollectionResponse,
} from '../src/guards.js';
import { generateEditorialSlug } from '../src/slug.js';

describe('articlesCollection', () => {
  it('defines the required article fields and editorial relationships', () => {
    expect(articlesCollection.slug).toBe('articles');

    const titleField = articlesCollection.fields.find((field) => field.name === 'title');
    expect(titleField).toMatchObject({ type: 'text', required: true, maxLength: 200 });

    const slugField = articlesCollection.fields.find((field) => field.name === 'slug');
    expect(slugField).toMatchObject({ type: 'text', unique: true, required: true });

    const excerptField = articlesCollection.fields.find((field) => field.name === 'excerpt');
    expect(excerptField).toMatchObject({ type: 'textarea', maxLength: 500 });

    const contentField = articlesCollection.fields.find((field) => field.name === 'content');
    expect(contentField).toMatchObject({ type: 'richText', required: true });

    const heroImageField = articlesCollection.fields.find((field) => field.name === 'heroImage');
    expect(heroImageField).toMatchObject({ type: 'upload', relationTo: 'media', required: true });

    const featuredProductsField = articlesCollection.fields.find(
      (field) => field.name === 'featuredProducts',
    );
    expect(featuredProductsField).toMatchObject({
      type: 'relationship',
      relationTo: 'featured-products',
      hasMany: true,
    });

    const sectionField = articlesCollection.fields.find((field) => field.name === 'section');
    expect(sectionField).toMatchObject({
      type: 'relationship',
      relationTo: 'editorial-sections',
    });

    expect(articlesCollection.fields.find((field) => field.name === 'spotlightEyebrow')).toMatchObject({
      type: 'text',
    });
    expect(articlesCollection.fields.find((field) => field.name === 'spotlightSubline')).toMatchObject({
      type: 'text',
    });
    expect(articlesCollection.fields.find((field) => field.name === 'spotlightPriceFormatted')).toMatchObject({
      type: 'text',
    });
    expect(articlesCollection.fields.find((field) => field.name === 'hideSpotlightCta')).toMatchObject({
      type: 'checkbox',
    });
  });

  it('limits article status to the requested workflow states', () => {
    const statusField = articlesCollection.fields.find((field) => field.name === 'status');

    expect(statusField).toMatchObject({
      type: 'select',
      required: true,
      options: ['draft', 'published', 'archived'],
    });
  });

  it('models tags as a multi-value text field', () => {
    const tagsField = articlesCollection.fields.find((field) => field.name === 'tags');

    expect(tagsField).toMatchObject({
      type: 'text',
      hasMany: true,
    });
  });
});

describe('editorialSectionsCollection', () => {
  it('defines layout options and active flag for homepage sections', () => {
    expect(editorialSectionsCollection.slug).toBe('editorial-sections');

    const nameField = editorialSectionsCollection.fields.find((field) => field.name === 'name');
    expect(nameField).toMatchObject({ type: 'text', required: true, unique: true });

    const layoutField = editorialSectionsCollection.fields.find((field) => field.name === 'layout');
    expect(layoutField).toMatchObject({
      type: 'select',
      options: ['hero-banner', 'card-grid-4', 'card-grid-2', 'horizontal-scroll'],
    });

    const isActiveField = editorialSectionsCollection.fields.find(
      (field) => field.name === 'isActive',
    );
    expect(isActiveField).toMatchObject({ type: 'checkbox', defaultValue: true });
  });
});

describe('generateEditorialSlug', () => {
  it('normalizes titles into lowercase hyphenated slugs', () => {
    expect(generateEditorialSlug(' Today Picks: Spring Launch! ')).toBe('today-picks-spring-launch');
  });

  it('collapses repeated separators and trims leading or trailing hyphens', () => {
    expect(generateEditorialSlug('---Hello   World---')).toBe('hello-world');
  });
});

describe('article guards', () => {
  const validSection = {
    id: 'section-1',
    name: 'Today',
    slug: 'today',
    layout: 'hero-banner',
    sortOrder: 1,
    isActive: true,
  };

  const validArticle = {
    id: 'article-1',
    title: 'Launch Day',
    slug: 'launch-day',
    excerpt: 'Short summary',
    content: { root: { children: [] } },
    heroImage: {
      id: 'media-1',
      url: '/media/hero.jpg',
      filename: 'hero.jpg',
    },
    author: 'Editorial Team',
    publishedAt: '2026-01-02T00:00:00.000Z',
    status: 'published',
    tags: ['launch', 'feature'],
    featuredProducts: [],
    section: validSection,
  };

  it('accepts valid article payloads', () => {
    expect(isArticle(validArticle)).toBe(true);
    expect(isEditorialSection(validSection)).toBe(true);
  });

  it('rejects malformed article payloads', () => {
    expect(
      isArticle({
        ...validArticle,
        heroImage: 'media-1',
      }),
    ).toBe(false);

    expect(
      isEditorialSection({
        ...validSection,
        layout: 'unknown-layout',
      }),
    ).toBe(false);
  });

  it('parses Payload paginated responses and validates each document', () => {
    const result = parsePaginatedCollectionResponse(
      {
        docs: [validArticle],
        hasNextPage: false,
        hasPrevPage: false,
        limit: 10,
        page: 1,
        pagingCounter: 1,
        totalDocs: 1,
        totalPages: 1,
      },
      isArticle,
      'articles',
    );

    expect(result.docs).toHaveLength(1);
    expect(result.docs[0]?.slug).toBe('launch-day');
  });

  it('throws for invalid paginated collection responses', () => {
    expect(() =>
      parsePaginatedCollectionResponse(
        {
          docs: [{ ...validArticle, status: 'invalid' }],
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10,
          page: 1,
          pagingCounter: 1,
          totalDocs: 1,
          totalPages: 1,
        },
        isArticle,
        'articles',
      ),
    ).toThrow(/Invalid articles response/);
  });
});
