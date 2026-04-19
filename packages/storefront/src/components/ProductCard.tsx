/**
 * Purpose: Product card for listing grids — displays hero image, name, creator, price, and tags.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 *   - docs/domain-model.md (Product entity)
 * External references:
 *   - https://heroui.com/docs/components/card
 *   - https://heroui.com/docs/components/chip
 *   - https://heroui.com/docs/components/skeleton
 * Tests:
 *   - packages/storefront/src/components/ProductCard.test.tsx
 */
import { Link } from 'react-router-dom';
import { Card, Chip, Skeleton } from '@heroui/react';
import type { ProductListItem } from '../types/product';
import type { WishlistApi } from '../types/wishlist';
import { WishlistButton } from './wishlist';

/** Format price from minor units (cents) to a display string. */
export function formatPrice(minorUnits: number, currencyCode: string): string {
  const major = minorUnits / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(major);
}

interface ProductCardProps {
  readonly product: ProductListItem;
  readonly href?: string;
  readonly wishlistApi?: WishlistApi;
  readonly showWishlistButton?: boolean;
}

export function ProductCard({
  product,
  href,
  wishlistApi,
  showWishlistButton = true,
}: ProductCardProps) {
  const hasPriceRange = product.priceMin !== product.priceMax;
  const priceDisplay = hasPriceRange
    ? `${formatPrice(product.priceMin, product.currencyCode)} – ${formatPrice(product.priceMax, product.currencyCode)}`
    : formatPrice(product.priceMin, product.currencyCode);

  return (
    <div className="relative">
      {showWishlistButton ? (
        <WishlistButton
          api={wishlistApi}
          className="absolute right-3 top-3 z-10"
          productId={product.id}
        />
      ) : null}
      <Link to={href ?? `/product/${product.slug}`} className="block focus-visible:outline-none">
        <Card className="h-full focus-visible:ring-2 focus-visible:ring-primary">
          {/* Hero image */}
          <div className="aspect-video overflow-hidden">
            {product.heroImageUrl ? (
              <img
                src={product.heroImageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                data-testid="product-card-placeholder"
                className="flex h-full w-full items-center justify-center bg-muted"
              >
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
          </div>

          <Card.Header className="pb-1">
            <Card.Title className="line-clamp-1 text-base">{product.name}</Card.Title>
            <Card.Description className="text-sm text-muted-foreground">
              {product.creatorName}
            </Card.Description>
          </Card.Header>

          <Card.Content className="pb-2 pt-0">
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.tags.map((tag) => (
                  <Chip key={tag} size="sm" variant="soft">
                    <Chip.Label>{tag}</Chip.Label>
                  </Chip>
                ))}
              </div>
            )}
          </Card.Content>

          <Card.Footer className="pt-0">
            <span className="font-semibold">{priceDisplay}</span>
          </Card.Footer>
        </Card>
      </Link>
    </div>
  );
}

/** Skeleton loading placeholder matching ProductCard dimensions. */
export function ProductCardSkeleton() {
  return (
    <div data-testid="product-card-skeleton">
      <Card className="h-full">
        <Skeleton className="aspect-video w-full rounded-none" />
        <Card.Header className="pb-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-1 h-4 w-1/2" />
        </Card.Header>
        <Card.Content className="pb-2 pt-0">
          <div className="flex gap-1">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </Card.Content>
        <Card.Footer className="pt-0">
          <Skeleton className="h-5 w-16" />
        </Card.Footer>
      </Card>
    </div>
  );
}
