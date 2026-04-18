/**
 * Purpose: Tests for StorefrontPlugin store-page helpers and entity invariants.
 * Governing docs:
 *   - docs/architecture.md (§5 Service ownership, Storefront plugin)
 *   - docs/service-architecture.md (§2 Vendure plugin contracts)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/
 *   - https://docs.vendure.io/guides/developer-guide/database-entity/
 * Tests:
 *   - (this file)
 */
import { describe, expect, it } from 'vitest';
import type { RuntimeVendureConfig } from '@vendure/core';
import {
  duplicatePage,
  filterPagesByScope,
  isPageVisibleToUser,
  sortPages,
  storefrontConfiguration,
  validateStorePage,
} from './storefront.plugin.js';
import { StorePageEntity } from './storefront.entity.js';

function createPage(overrides: Partial<StorePageEntity> = {}): StorePageEntity {
  const page = new StorePageEntity({
    title: 'Welcome Page',
    slug: 'welcome-page',
    scope: 'universal',
    productId: null,
    isPostSale: false,
    isTemplate: false,
    content: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    }),
    sortOrder: 10,
    enabled: true,
    ...overrides,
  });

  page.createdAt = overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z');
  page.updatedAt = overrides.updatedAt ?? new Date('2024-01-01T00:00:00.000Z');

  return page;
}

describe('StorefrontPlugin', () => {
  describe('StorePageEntity structure', () => {
    it('can be instantiated with DeepPartial input', () => {
      const page = createPage({
        title: 'Setup Guide',
        slug: 'setup-guide',
        scope: 'product',
        productId: 'prod-1',
        isPostSale: true,
        isTemplate: true,
        sortOrder: 3,
      });

      expect(page.title).toBe('Setup Guide');
      expect(page.slug).toBe('setup-guide');
      expect(page.scope).toBe('product');
      expect(page.productId).toBe('prod-1');
      expect(page.isPostSale).toBe(true);
      expect(page.isTemplate).toBe(true);
      expect(page.sortOrder).toBe(3);
      expect(page.enabled).toBe(true);
    });

    it('has no validation errors for a valid universal page', () => {
      expect(validateStorePage(createPage())).toEqual([]);
    });
  });

  describe('storefrontConfiguration', () => {
    it('preserves existing config shape', () => {
      const baseConfig = {
        customFields: {
          Product: [{ name: 'existingField', type: 'string' }],
        },
      } as RuntimeVendureConfig;

      const result = storefrontConfiguration(baseConfig);

      expect(result).toBe(baseConfig);
      expect(result.customFields?.Product).toHaveLength(1);
    });
  });

  describe('validateStorePage', () => {
    it('requires title, slug, content, and a finite sort order', () => {
      const errors = validateStorePage(
        createPage({
          title: '',
          slug: '',
          content: '',
          sortOrder: Number.NaN,
        }),
      );

      expect(errors).toEqual(
        expect.arrayContaining([
          'title is required',
          'slug is required',
          'content is required',
          'sortOrder must be a finite number',
        ]),
      );
    });

    it('accepts valid slugs', () => {
      const validSlugs = ['page', 'page-2', 'setup-guide', 'a1-b2-c3'];

      for (const slug of validSlugs) {
        expect(validateStorePage(createPage({ slug }))).toEqual([]);
      }
    });

    it('rejects invalid slugs with spaces or special characters', () => {
      const invalidSlugs = ['with spaces', 'UPPERCASE', 'bad_slug', 'bad!', 'ends-', '-starts'];

      for (const slug of invalidSlugs) {
        expect(validateStorePage(createPage({ slug }))).toContain(
          'slug must contain only lowercase letters, numbers, and single hyphens between segments',
        );
      }
    });

    it('requires productId when scope is product', () => {
      const errors = validateStorePage(
        createPage({
          scope: 'product',
          productId: null,
        }),
      );

      expect(errors).toContain('productId is required when scope is product');
    });

    it('requires null productId when scope is universal', () => {
      const errors = validateStorePage(
        createPage({
          scope: 'universal',
          productId: 'prod-1',
        }),
      );

      expect(errors).toContain('productId must be null when scope is universal');
    });

    it('rejects unsupported scopes', () => {
      const errors = validateStorePage(
        createPage({
          scope: 'creator' as StorePageEntity['scope'],
        }),
      );

      expect(errors).toContain('scope must be either "universal" or "product"');
    });
  });

  describe('isPageVisibleToUser', () => {
    it.each([
      { isPostSale: false, hasPurchased: false, enabled: false, expected: false },
      { isPostSale: false, hasPurchased: false, enabled: true, expected: true },
      { isPostSale: false, hasPurchased: true, enabled: false, expected: false },
      { isPostSale: false, hasPurchased: true, enabled: true, expected: true },
      { isPostSale: true, hasPurchased: false, enabled: false, expected: false },
      { isPostSale: true, hasPurchased: false, enabled: true, expected: false },
      { isPostSale: true, hasPurchased: true, enabled: false, expected: false },
      { isPostSale: true, hasPurchased: true, enabled: true, expected: true },
    ])(
      'returns $expected when isPostSale=$isPostSale hasPurchased=$hasPurchased enabled=$enabled',
      ({ enabled, expected, hasPurchased, isPostSale }) => {
        expect(
          isPageVisibleToUser(
            createPage({
              isPostSale,
              enabled,
            }),
            hasPurchased,
          ),
        ).toBe(expected);
      },
    );
  });

  describe('sortPages', () => {
    it('sorts by sortOrder ascending and then by createdAt ascending', () => {
      const pages = [
        createPage({
          title: 'Later same sort order',
          slug: 'later-same-sort-order',
          sortOrder: 2,
          createdAt: new Date('2024-01-03T00:00:00.000Z'),
        }),
        createPage({
          title: 'First',
          slug: 'first',
          sortOrder: 1,
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
        }),
        createPage({
          title: 'Earlier same sort order',
          slug: 'earlier-same-sort-order',
          sortOrder: 2,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        }),
      ];

      expect(sortPages(pages).map((page) => page.slug)).toEqual([
        'first',
        'earlier-same-sort-order',
        'later-same-sort-order',
      ]);
    });
  });

  describe('filterPagesByScope', () => {
    const universalPage = createPage({ slug: 'universal-page', scope: 'universal', productId: null });
    const productPage = createPage({ slug: 'product-page', scope: 'product', productId: 'prod-1' });
    const otherProductPage = createPage({
      slug: 'other-product-page',
      scope: 'product',
      productId: 'prod-2',
    });

    it('returns only universal pages when productId is omitted', () => {
      expect(filterPagesByScope([universalPage, productPage, otherProductPage])).toEqual([
        universalPage,
      ]);
    });

    it('returns universal pages and matching product pages when productId is provided', () => {
      expect(
        filterPagesByScope([universalPage, productPage, otherProductPage], 'prod-1'),
      ).toEqual([universalPage, productPage]);
    });
  });

  describe('duplicatePage', () => {
    it('creates a new page copy with a new slug and deep-copied content', () => {
      const source = createPage({
        slug: 'base-template',
        isTemplate: true,
        content: JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'template' }] }],
        }),
      });

      const duplicate = duplicatePage(source);

      expect(duplicate).toBeInstanceOf(StorePageEntity);
      expect(duplicate.slug).toBe('base-template-copy');
      expect(duplicate.isTemplate).toBe(false);
      expect(duplicate.content).toBe(source.content);
      expect(JSON.parse(duplicate.content)).toEqual(JSON.parse(source.content));
      expect(duplicate.title).toBe(source.title);
      expect(duplicate.id).toBeUndefined();
    });

    it('applies overrides to the duplicated page', () => {
      const duplicate = duplicatePage(createPage({ slug: 'template-page', isTemplate: true }), {
        title: 'Duplicated Page',
        slug: 'duplicated-page',
        productId: 'prod-9',
        scope: 'product',
      });

      expect(duplicate.title).toBe('Duplicated Page');
      expect(duplicate.slug).toBe('duplicated-page');
      expect(duplicate.scope).toBe('product');
      expect(duplicate.productId).toBe('prod-9');
    });
  });
});
