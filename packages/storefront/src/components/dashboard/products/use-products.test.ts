/**
 * Purpose: Regression tests for creator product CRUD state and pure form utilities.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/use-products.test.ts
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  calculateCreatorEarnings,
  formatPrice,
  generateSlug,
  useProducts,
  validateProductForm,
} from './use-products';
import type { ProductFormData, ProductSummary } from './product-types';

const INITIAL_PRODUCTS: readonly ProductSummary[] = [
  {
    id: 'prod-1',
    name: 'Brush Pack',
    slug: 'brush-pack',
    price: 2500,
    currency: 'USD',
    visibility: 'published',
    salesCount: 12,
    revenue: 30000,
    heroImageUrl: 'https://cdn.example.com/brush-pack.webp',
    createdAt: '2025-02-01T10:00:00.000Z',
    updatedAt: '2025-02-02T10:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'Shader Pack',
    slug: 'shader-pack',
    price: 4500,
    currency: 'USD',
    visibility: 'draft',
    salesCount: 3,
    revenue: 13500,
    heroImageUrl: 'https://cdn.example.com/shader-pack.webp',
    createdAt: '2025-03-01T10:00:00.000Z',
    updatedAt: '2025-03-01T10:00:00.000Z',
  },
];

const NEW_PRODUCT: ProductFormData = {
  name: 'Texture Pack',
  slug: 'texture-pack',
  description: '{"type":"doc"}',
  shortDescription: 'Texture pack',
  price: 1999,
  compareAtPrice: 2499,
  currency: 'USD',
  platformFeePercent: 10,
  tags: ['texture'],
  heroImageId: 'hero-3',
  heroTransparentId: 'transparent-3',
  galleryImageIds: ['gallery-3'],
  termsOfService: '{"type":"doc"}',
  visibility: 'draft',
};

describe('useProducts', () => {
  it('filters products when fetching', async () => {
    const { result } = renderHook(() =>
      useProducts({ initialProducts: INITIAL_PRODUCTS }),
    );

    await act(async () => {
      await result.current.actions.fetchProducts({ search: 'shader' });
    });

    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0]?.name).toBe('Shader Pack');
  });

  it('creates and deletes products', async () => {
    const { result } = renderHook(() =>
      useProducts({ initialProducts: INITIAL_PRODUCTS }),
    );

    await act(async () => {
      await result.current.actions.createProduct(NEW_PRODUCT);
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(3);
    });

    const createdId = result.current.products.find((product) => product.slug === 'texture-pack')?.id;
    expect(createdId).toBeDefined();

    await act(async () => {
      await result.current.actions.deleteProduct(createdId!);
    });

    expect(result.current.products).toHaveLength(2);
  });

  it('duplicates products', async () => {
    const { result } = renderHook(() =>
      useProducts({ initialProducts: INITIAL_PRODUCTS }),
    );

    await act(async () => {
      await result.current.actions.duplicateProduct('prod-1');
    });

    expect(result.current.products).toHaveLength(3);
    expect(result.current.products.some((product) => product.name.includes('Copy'))).toBe(true);
  });
});

describe('product validation utilities', () => {
  it('validates required fields and numeric constraints', () => {
    expect(
      validateProductForm({
        name: '',
        slug: 'Bad Slug!',
        price: 0,
        platformFeePercent: 2,
      }),
    ).toEqual(
      expect.objectContaining({
        name: 'Product name is required.',
        slug: 'Slug can only contain lowercase letters, numbers, and hyphens.',
        price: 'Price must be greater than 0.',
        platformFeePercent: 'Platform fee must be between 5% and 30%.',
      }),
    );
  });

  it('generates slugs from product names', () => {
    expect(generateSlug('  My Great Product!!!  ')).toBe('my-great-product');
  });

  it('formats money from cents', () => {
    expect(formatPrice(2599, 'USD')).toBe('$25.99');
  });

  it('calculates creator earnings after the platform fee', () => {
    expect(calculateCreatorEarnings(10000, 15)).toBe(8500);
  });
});
