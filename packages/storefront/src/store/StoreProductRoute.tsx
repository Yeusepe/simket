/**
 * Purpose: Render store-scoped product detail pages using the current creator-store context.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront)
 *   - docs/domain-model.md (§1 Product)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§2 explicit data flow)
 * External references:
 *   - https://reactrouter.com/api/hooks/useParams
 * Tests:
 *   - packages/storefront/src/App.test.tsx
 */
import { useMemo } from 'react';
import { ProductDetailPage } from '../components/ProductDetailPage';
import { StoreNotFoundPage } from './StoreNotFoundPage';
import { useStore } from './use-store';

export function StoreProductRoute() {
  const { currentProduct, hrefs, resolution, store } = useStore();

  const fetcher = useMemo(
    () => async (slug: string) => {
      const product = store.products.find((candidate) => candidate.slug === slug);

      if (!product) {
        throw new Error(`Product "${slug}" was not found in ${store.creator.displayName}'s store.`);
      }

      return product;
    },
    [store],
  );

  if (!currentProduct || !resolution.productSlug) {
    return (
      <StoreNotFoundPage
        title="Product not found"
        message={`The product "${resolution.productSlug ?? 'unknown'}" does not exist in ${store.creator.displayName}'s store.`}
      />
    );
  }

  return (
    <ProductDetailPage
      fetcher={fetcher}
      slug={resolution.productSlug}
      buildProductHref={hrefs.product}
    />
  );
}
