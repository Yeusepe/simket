/**
 * Purpose: Product detail page — hero media, description, price, tags,
 *          creator info, add-to-cart, and dependency warnings.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 *   - docs/domain-model.md (Product entity, dependency relationships)
 * External references:
 *   - HeroUI v3 Button: https://heroui.com/docs/react/components/button
 *     Variants: primary/secondary/tertiary/outline/ghost/danger. Sizes: sm/md/lg.
 *   - HeroUI v3 Chip: https://heroui.com/docs/react/components/chip
 *     Compound: Chip > Chip.Label. Variants: primary/secondary/tertiary/soft.
 *   - HeroUI v3 Card: https://heroui.com/docs/react/components/card
 *     Compound: Card > Card.Header > Card.Title + Card.Description, Card.Content, Card.Footer.
 *   - HeroUI v3 Separator: https://heroui.com/docs/react/components/separator
 *   - HeroUI v3 Spinner: https://heroui.com/docs/react/components/spinner
 *   - HeroUI v3 Avatar: https://heroui.com/docs/react/components/avatar
 *     Compound: Avatar > Avatar.Image + Avatar.Fallback.
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#product
 * Tests:
 *   - packages/storefront/src/components/ProductDetailPage.test.tsx
 */
import { useState, useEffect } from 'react';
import { PageRenderer, type ThemeOverrides } from '../builder';
import {
  Spinner,
} from '@heroui/react';
import type { ProductDetail } from '../types/product';
import type { WishlistApi } from '../types/wishlist';
import { ProductDetailContent } from './ProductDetailContent';
import { formatPrice } from './ProductCard';
import {
  useExperimentVariant,
  type UseExperimentVariantOptions,
} from '../hooks/useExperimentVariant';

export type ProductDetailFetcher = (slug: string) => Promise<ProductDetail>;

interface ProductDetailPageProps {
  readonly fetcher: ProductDetailFetcher;
  readonly slug: string;
  readonly buildProductHref?: (productSlug: string) => string;
  readonly experimentOptions?: UseExperimentVariantOptions;
  readonly wishlistApi?: WishlistApi;
  readonly pageTheme?: ThemeOverrides;
}

export function ProductDetailPage({
  fetcher,
  slug,
  buildProductHref = (productSlug) => `/product/${productSlug}`,
  experimentOptions,
  wishlistApi,
  pageTheme,
}: ProductDetailPageProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const experimentVariant = useExperimentVariant(product?.id ?? null, {
    enabled: Boolean(experimentOptions),
    ...experimentOptions,
  });

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetcher(slug)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetcher, slug]);

  if (isLoading) {
    return (
      <div data-testid="product-detail-loading" className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div role="alert" className="rounded-lg border border-danger bg-danger/10 p-4 text-danger">
          {error.message}
        </div>
      </div>
    );
  }

  if (!product) return null;

  const primaryVariant = product.variants[0];
  const experimentConfig = (experimentVariant.variant?.config ?? {}) as Record<string, unknown>;
  const price = typeof experimentConfig.priceDisplay === 'string'
    ? experimentConfig.priceDisplay
    : primaryVariant
    ? formatPrice(primaryVariant.price, primaryVariant.currencyCode)
    : 'Free';
  const description = typeof experimentConfig.description === 'string'
    ? experimentConfig.description
    : product.description;
  const ctaText = typeof experimentConfig.ctaText === 'string'
    ? experimentConfig.ctaText
    : 'Add to cart';

  if (product.framelyPageSchema) {
    return (
      <PageRenderer
        schema={{
          ...product.framelyPageSchema,
          theme: {
            ...(pageTheme ?? {}),
            ...(product.framelyPageSchema.theme ?? {}),
          },
        }}
        context={{
          kind: 'product',
          product: product as unknown as Record<string, unknown>,
          hrefs: {
            product: buildProductHref,
          },
        }}
      />
    );
  }

  return (
    <ProductDetailContent
      product={product}
      buildProductHref={buildProductHref}
      wishlistApi={wishlistApi}
      priceDisplay={price}
      descriptionText={description}
      ctaText={ctaText}
    />
  );
}
