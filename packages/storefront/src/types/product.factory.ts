/**
 * Test factories for product types — consistent test data generation.
 */
import type { ProductListItem, FacetGroup, ProductListingResponse, PaginatedList, ProductDetail, ProductVariant } from './product';

let _counter = 0;

export function makeProductListItem(
  overrides: Partial<ProductListItem> = {},
): ProductListItem {
  _counter++;
  return {
    id: `product-${_counter}`,
    slug: `product-${_counter}`,
    name: `Test Product ${_counter}`,
    description: `Description for product ${_counter}`,
    priceMin: 999,
    priceMax: 999,
    currencyCode: 'USD',
    heroImageUrl: `https://cdn.example.com/products/${_counter}/hero.webp`,
    heroTransparentUrl: null,
    creatorName: `Creator ${_counter}`,
    creatorAvatarUrl: null,
    collaborators: undefined,
    averageRating: null,
    reviewCount: null,
    tags: ['tag-a', 'tag-b'],
    categorySlug: 'digital-art',
    ...overrides,
  };
}

export function makeProductList(
  count: number,
  overrides: Partial<ProductListItem> = {},
): PaginatedList<ProductListItem> {
  return {
    items: Array.from({ length: count }, () => makeProductListItem(overrides)),
    totalItems: count,
  };
}

export function makeFacetGroups(): readonly FacetGroup[] {
  return [
    {
      name: 'Category',
      values: [
        { value: 'digital-art', label: 'Digital Art', count: 42 },
        { value: 'music', label: 'Music', count: 18 },
        { value: 'software', label: 'Software', count: 7 },
      ],
    },
    {
      name: 'Tags',
      values: [
        { value: 'tag-a', label: 'Tag A', count: 30 },
        { value: 'tag-b', label: 'Tag B', count: 20 },
      ],
    },
  ];
}

export function makeProductListingResponse(
  count = 12,
  totalItems?: number,
): ProductListingResponse {
  const products = makeProductList(count);
  return {
    products: {
      items: products.items,
      totalItems: totalItems ?? count,
    },
    facets: makeFacetGroups(),
  };
}

/** Reset the counter between tests for deterministic IDs. */
export function resetProductCounter(): void {
  _counter = 0;
}

export function makeProductVariant(
  overrides: Partial<ProductVariant> = {},
): ProductVariant {
  _counter++;
  return {
    id: `variant-${_counter}`,
    name: `Default`,
    price: 999,
    currencyCode: 'USD',
    sku: `SKU-${_counter}`,
    stockLevel: 'IN_STOCK',
    ...overrides,
  };
}

export function makeProductDetail(
  overrides: Partial<ProductDetail> = {},
): ProductDetail {
  _counter++;
  return {
    id: `product-${_counter}`,
    slug: `product-${_counter}`,
    name: `Test Product ${_counter}`,
    tiptapDescription: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A great product.' }] }] },
    description: 'A great product.',
    variants: [makeProductVariant()],
    currencyCode: 'USD',
    heroMediaUrl: `https://cdn.example.com/products/${_counter}/hero.webp`,
    heroMediaType: 'image',
    heroTransparentUrl: null,
    heroBackgroundUrl: null,
    termsOfService: null,
    tags: ['tag-a', 'tag-b'],
    categorySlug: 'digital-art',
    creator: {
      id: `creator-${_counter}`,
      name: `Creator ${_counter}`,
      avatarUrl: `https://cdn.example.com/avatars/${_counter}.webp`,
    },
    requiredProductIds: [],
    dependencyRequirements: [],
    availableBundles: [],
    framelyPageSchema: null,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}
