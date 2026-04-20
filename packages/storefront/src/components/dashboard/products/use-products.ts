/**
 * Purpose: Creator product dashboard state hook plus shared pricing and validation helpers.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://docs.vendure.io/
 *   - https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/use-products.test.ts
 */
import { useCallback, useMemo, useState } from 'react';
import type { ProductFormData, ProductFormErrors, ProductListFilters, ProductSummary } from './product-types';

interface ProductRecord {
  readonly summary: ProductSummary;
  readonly formData: ProductFormData;
}

export interface CreatorProductsApi {
  readonly list: (filters?: ProductListFilters) => Promise<readonly ProductSummary[]>;
  readonly create: (data: ProductFormData) => Promise<ProductSummary>;
  readonly update: (id: string, data: ProductFormData) => Promise<ProductSummary>;
  readonly delete: (id: string) => Promise<void>;
  readonly duplicate: (id: string) => Promise<ProductSummary>;
}

export interface UseProductsOptions {
  readonly initialProducts?: readonly ProductSummary[];
  readonly api?: CreatorProductsApi;
}

export interface UseProductsActions {
  readonly fetchProducts: (filters?: ProductListFilters) => Promise<void>;
  readonly createProduct: (data: ProductFormData) => Promise<ProductSummary>;
  readonly updateProduct: (id: string, data: ProductFormData) => Promise<ProductSummary>;
  readonly deleteProduct: (id: string) => Promise<void>;
  readonly duplicateProduct: (id: string) => Promise<ProductSummary>;
}

export interface UseProductsReturn {
  readonly products: readonly ProductSummary[];
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly actions: UseProductsActions;
}

const DEFAULT_FILTERS: ProductListFilters = {
  search: '',
  visibility: 'all',
  sortBy: 'name',
  sortDirection: 'asc',
};

const EMPTY_RICH_TEXT = JSON.stringify({ type: 'doc', content: [] });

export function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function calculateCreatorEarnings(price: number, feePercent: number): number {
  return Math.round(price * ((100 - feePercent) / 100));
}

function isBlankRichText(value: string | undefined): boolean {
  if (!value || value.trim().length === 0) {
    return true;
  }

  try {
    const parsed = JSON.parse(value) as { text?: string; content?: readonly unknown[] };
    if (typeof parsed.text === 'string' && parsed.text.trim().length > 0) {
      return false;
    }

    return !Array.isArray(parsed.content) || parsed.content.length === 0;
  } catch {
    return value.trim().length === 0;
  }
}

export function validateProductForm(data: Partial<ProductFormData>): ProductFormErrors {
  const errors: ProductFormErrors = {};

  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Product name is required.';
  }

  if (!data.slug || data.slug.trim().length === 0) {
    errors.slug = 'Slug is required.';
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens.';
  }

  if (!data.shortDescription || data.shortDescription.trim().length === 0) {
    errors.shortDescription = 'Short description is required.';
  }

  if (isBlankRichText(data.description)) {
    errors.description = 'Product description is required.';
  }

  if (typeof data.price !== 'number' || Number.isNaN(data.price) || data.price <= 0) {
    errors.price = 'Price must be greater than 0.';
  }

  if (
    typeof data.compareAtPrice === 'number' &&
    !Number.isNaN(data.compareAtPrice) &&
    data.compareAtPrice > 0 &&
    typeof data.price === 'number' &&
    data.compareAtPrice <= data.price
  ) {
    errors.compareAtPrice = 'Compare-at price must be greater than the current price.';
  }

  if (!data.currency || data.currency.trim().length === 0) {
    errors.currency = 'Currency is required.';
  }

  if (
    typeof data.platformFeePercent !== 'number' ||
    Number.isNaN(data.platformFeePercent) ||
    data.platformFeePercent < 5 ||
    data.platformFeePercent > 30
  ) {
    errors.platformFeePercent = 'Platform fee must be between 5% and 30%.';
  }

  if (isBlankRichText(data.termsOfService)) {
    errors.termsOfService = 'Terms of service are required.';
  }

  return errors;
}

function createDefaultFormData(summary: ProductSummary): ProductFormData {
  return {
    name: summary.name,
    slug: summary.slug,
    description: EMPTY_RICH_TEXT,
    shortDescription: '',
    price: summary.price,
    compareAtPrice: undefined,
    currency: summary.currency,
    platformFeePercent: 5,
    tags: [],
    heroImageId: undefined,
    heroTransparentId: undefined,
    galleryImageIds: [],
    termsOfService: EMPTY_RICH_TEXT,
    visibility: summary.visibility,
  };
}

function toSummary(formData: ProductFormData, existing?: ProductSummary): ProductSummary {
  const timestamp = new Date().toISOString();

  return {
    id: existing?.id ?? `product-${crypto.randomUUID()}`,
    name: formData.name,
    slug: formData.slug,
    price: formData.price,
    currency: formData.currency,
    visibility: formData.visibility,
    salesCount: existing?.salesCount ?? 0,
    revenue: existing?.revenue ?? 0,
    heroImageUrl: existing?.heroImageUrl,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

function toRecord(summary: ProductSummary): ProductRecord {
  return {
    summary,
    formData: createDefaultFormData(summary),
  };
}

function sortProducts(
  products: readonly ProductSummary[],
  filters: ProductListFilters,
): readonly ProductSummary[] {
  const search = filters.search?.trim().toLowerCase() ?? '';
  const visibility = filters.visibility ?? 'all';
  const sortBy = filters.sortBy ?? 'name';
  const sortDirection = filters.sortDirection ?? 'asc';

  const filtered = products.filter((product) => {
    const matchesSearch =
      search.length === 0 ||
      product.name.toLowerCase().includes(search) ||
      product.slug.toLowerCase().includes(search);
    const matchesVisibility = visibility === 'all' || product.visibility === visibility;
    return matchesSearch && matchesVisibility;
  });

  return [...filtered].sort((left, right) => {
    let comparison = 0;

    switch (sortBy) {
      case 'price':
        comparison = left.price - right.price;
        break;
      case 'sales':
        comparison = left.salesCount - right.salesCount;
        break;
      case 'date':
        comparison =
          new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
        break;
      case 'name':
      default:
        comparison = left.name.localeCompare(right.name);
        break;
    }

    return sortDirection === 'desc' ? comparison * -1 : comparison;
  });
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const [records, setRecords] = useState<readonly ProductRecord[]>(
    () => (options.initialProducts ?? []).map(toRecord),
  );
  const [activeFilters, setActiveFilters] = useState<ProductListFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const products = useMemo(
    () => sortProducts(records.map((record) => record.summary), activeFilters),
    [records, activeFilters],
  );

  const fetchProducts = useCallback(async (filters: ProductListFilters = DEFAULT_FILTERS) => {
    setIsLoading(true);
    setError(null);

    try {
      setActiveFilters({
        ...DEFAULT_FILTERS,
        ...filters,
      });
      if (options.api) {
        const nextProducts = await options.api.list(filters);
        setRecords(nextProducts.map(toRecord));
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError : new Error(String(fetchError)));
    } finally {
      setIsLoading(false);
    }
  }, [options.api]);

  const createProduct = useCallback(async (data: ProductFormData) => {
    const nextSummary = options.api ? await options.api.create(data) : toSummary(data);
    const nextRecord: ProductRecord = {
      summary: nextSummary,
      formData: data,
    };

    setRecords((current) => [...current, nextRecord]);
    return nextSummary;
  }, [options.api]);

  const updateProduct = useCallback(async (id: string, data: ProductFormData) => {
    if (options.api) {
      const updatedSummary = await options.api.update(id, data);
      setRecords((current) =>
        current.map((record) => record.summary.id === id ? { summary: updatedSummary, formData: data } : record),
      );
      return updatedSummary;
    }

    let updatedSummary: ProductSummary | undefined;

    setRecords((current) =>
      current.map((record) => {
        if (record.summary.id !== id) {
          return record;
        }

        updatedSummary = toSummary(data, record.summary);
        return {
          summary: updatedSummary,
          formData: data,
        };
      }),
    );

    if (!updatedSummary) {
      throw new Error(`Product ${id} was not found.`);
    }

    return updatedSummary;
  }, [options.api]);

  const deleteProduct = useCallback(async (id: string) => {
    if (options.api) {
      await options.api.delete(id);
    }
    setRecords((current) => current.filter((record) => record.summary.id !== id));
  }, [options.api]);

  const duplicateProduct = useCallback(async (id: string) => {
    if (options.api) {
      const duplicatedSummary = await options.api.duplicate(id);
      setRecords((current) => [...current, toRecord(duplicatedSummary)]);
      return duplicatedSummary;
    }

    const currentRecord = records.find((record) => record.summary.id === id);
    if (!currentRecord) {
      throw new Error(`Product ${id} was not found.`);
    }

    const duplicatedData: ProductFormData = {
      ...currentRecord.formData,
      name: `${currentRecord.formData.name} Copy`,
      slug: `${currentRecord.formData.slug}-copy`,
      visibility: 'draft',
    };

    return createProduct(duplicatedData);
  }, [createProduct, options.api, records]);

  return {
    products,
    isLoading,
    error,
    actions: {
      fetchProducts,
      createProduct,
      updateProduct,
      deleteProduct,
      duplicateProduct,
    },
  };
}
