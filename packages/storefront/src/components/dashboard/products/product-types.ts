/**
 * Purpose: Shared creator product dashboard types for form state, list rows, and validation.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://docs.vendure.io/
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/use-products.test.ts
 *   - packages/storefront/src/components/dashboard/products/ProductForm.test.tsx
 */
export interface ProductFormData {
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly shortDescription: string;
  readonly price: number;
  readonly compareAtPrice?: number;
  readonly currency: string;
  readonly platformFeePercent: number;
  readonly tags: readonly string[];
  readonly heroImageId?: string;
  readonly heroTransparentId?: string;
  readonly galleryImageIds: readonly string[];
  readonly termsOfService: string;
  readonly visibility: 'draft' | 'published' | 'archived';
}

export interface ProductSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly price: number;
  readonly currency: string;
  readonly visibility: 'draft' | 'published' | 'archived';
  readonly salesCount: number;
  readonly revenue: number;
  readonly heroImageUrl?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormData, string>>;

export interface ProductListFilters {
  readonly search?: string;
  readonly visibility?: 'all' | ProductFormData['visibility'];
  readonly sortBy?: 'name' | 'price' | 'sales' | 'date';
  readonly sortDirection?: 'asc' | 'desc';
}

export interface ProductMediaPreviewMap {
  readonly [assetId: string]: string | undefined;
}
