/**
 * Purpose: Export surface for creator product dashboard components, hooks, and product types.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/ProductForm.test.tsx
 *   - packages/storefront/src/components/dashboard/products/use-products.test.ts
 */
export { ProductForm } from './ProductForm';
export { ProductList } from './ProductList';
export { ProductMedia } from './ProductMedia';
export { ProductPricing } from './ProductPricing';
export { ProductSettings } from './ProductSettings';
export {
  calculateCreatorEarnings,
  formatPrice,
  generateSlug,
  useProducts,
  validateProductForm,
} from './use-products';
export type {
  ProductFormData,
  ProductFormErrors,
  ProductListFilters,
  ProductMediaPreviewMap,
  ProductSummary,
} from './product-types';
