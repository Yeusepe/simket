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
import {
  Button,
  Chip,
  Separator,
  Spinner,
  Avatar,
} from '@heroui/react';
import type { ProductDetail } from '../types/product';
import { formatPrice } from './ProductCard';
import { useCartState } from '../state/cart-state';

export type ProductDetailFetcher = (slug: string) => Promise<ProductDetail>;

interface ProductDetailPageProps {
  readonly fetcher: ProductDetailFetcher;
  readonly slug: string;
}

export function ProductDetailPage({ fetcher, slug }: ProductDetailPageProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const addItem = useCartState((state) => state.addItem);

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
  const price = primaryVariant
    ? formatPrice(primaryVariant.price, primaryVariant.currencyCode)
    : 'Free';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Hero media — left column (3/5) */}
        <div className="lg:col-span-3">
          <HeroMedia
            url={product.heroMediaUrl}
            type={product.heroMediaType}
            alt={product.name}
            transparentUrl={product.heroTransparentUrl}
            backgroundUrl={product.heroBackgroundUrl}
          />
        </div>

        {/* Info panel — right column (2/5) */}
        <div className="space-y-4 lg:col-span-2">
          <h1 className="text-3xl font-bold">{product.name}</h1>

          {/* Creator */}
          <CreatorCard creator={product.creator} />

          <Separator />

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{price}</span>
            {primaryVariant && primaryVariant.stockLevel === 'OUT_OF_STOCK' && (
              <Chip variant="soft">
                <Chip.Label>Out of stock</Chip.Label>
              </Chip>
            )}
          </div>

          {/* Dependencies warning */}
          {product.requiredProductIds.length > 0 && (
            <div
              className="rounded-lg border border-warning bg-warning/10 p-3 text-sm text-warning"
            >
              This product requires other products to be purchased first.
            </div>
          )}

          {/* Add to cart */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            isDisabled={primaryVariant?.stockLevel === 'OUT_OF_STOCK'}
            onPress={() => {
              if (!primaryVariant) {
                return;
              }

              addItem({
                productId: product.id,
                variantId: primaryVariant.id,
                name: product.name,
                price: primaryVariant.price,
                currencyCode: primaryVariant.currencyCode,
                quantity: 1,
                heroImageUrl: product.heroMediaType === 'image' ? product.heroMediaUrl : null,
                slug: product.slug,
              });
            }}
          >
            Add to cart
          </Button>

          <Separator />

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Chip key={tag} variant="soft" size="sm">
                  <Chip.Label>{tag}</Chip.Label>
                </Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description section */}
      <Separator className="my-8" />
      <section>
        <h2 className="mb-4 text-xl font-semibold">Description</h2>
        {/* TODO: Replace with TipTap read-only renderer when TipTap is integrated (task 6-01) */}
        <div className="prose max-w-none dark:prose-invert">
          <p>{product.description}</p>
        </div>
      </section>

      {/* Terms of Service */}
      {Boolean(product.termsOfService) && (
        <>
          <Separator className="my-8" />
          <section>
            <h2 className="mb-4 text-xl font-semibold">Terms of Service</h2>
            <div className="prose max-w-none dark:prose-invert">
              {/* TODO: Replace with TipTap read-only renderer (task 6-01) */}
              <p>{String(product.termsOfService ?? '')}</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function HeroMedia({
  url,
  type,
  alt,
  transparentUrl,
  backgroundUrl,
}: {
  url: string | null;
  type: string;
  alt: string;
  transparentUrl: string | null;
  backgroundUrl: string | null;
}) {
  if (!url) {
    return (
      <div
        data-testid="hero-placeholder"
        className="flex aspect-video items-center justify-center rounded-xl bg-muted"
      >
        <span className="text-muted-foreground">No media available</span>
      </div>
    );
  }

  // Depth effect: transparent image over background
  if (transparentUrl && backgroundUrl) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-xl">
        <img
          src={backgroundUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
        <img
          src={transparentUrl}
          alt={alt}
          className="relative z-10 h-full w-full object-contain"
        />
      </div>
    );
  }

  if (type === 'video') {
    return (
      <video
        data-testid="hero-video"
        src={url}
        className="aspect-video w-full rounded-xl object-cover"
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  // Default: image or animated webp
  return (
    <img
      src={url}
      alt={alt}
      className="aspect-video w-full rounded-xl object-cover"
    />
  );
}

function CreatorCard({
  creator,
}: {
  creator: { id: string; name: string; avatarUrl: string | null };
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        {creator.avatarUrl && <Avatar.Image src={creator.avatarUrl} alt={creator.name} />}
        <Avatar.Fallback>{creator.name.charAt(0)}</Avatar.Fallback>
      </Avatar>
      <span className="text-sm font-medium">{creator.name}</span>
    </div>
  );
}
