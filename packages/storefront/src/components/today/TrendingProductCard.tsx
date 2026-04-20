/**
 * Purpose: Today “Trending” carousel tile — minimal layout on {@link ProductTileCard}.
 * Tests:
 *   - packages/storefront/src/components/today/TrendingProductCard.test.tsx
 */
import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import type { ProductListItem } from '../../types/product';
import type { WishlistApi } from '../../types/wishlist';
import { Icon } from '../common/Icon';
import { ProductComposedCard } from '../product-tile/ProductComposedCard';
import { formatPrice } from '../ProductCard';
import { WishlistButton } from '../wishlist';
import { TrendingProductTags } from './TrendingProductTags';

export interface TrendingProductCardProps {
  readonly product: ProductListItem;
  readonly href?: string;
  readonly wishlistApi?: WishlistApi;
  readonly showWishlistButton?: boolean;
  readonly articleClassName?: string;
  readonly articleProps?: ComponentProps<typeof ProductComposedCard>['articleProps'];
}

export function TrendingProductCard({
  product,
  href,
  wishlistApi,
  showWishlistButton = true,
  articleClassName,
  articleProps,
}: TrendingProductCardProps) {
  const hasPriceRange = product.priceMin !== product.priceMax;
  const priceDisplay = useMemo(
    () =>
      hasPriceRange
        ? `${formatPrice(product.priceMin, product.currencyCode)} – ${formatPrice(product.priceMax, product.currencyCode)}`
        : formatPrice(product.priceMin, product.currencyCode),
    [hasPriceRange, product.currencyCode, product.priceMax, product.priceMin],
  );

  const productHref = href ?? `/product/${product.slug}`;

  return (
    <ProductComposedCard
      productHref={productHref}
      title={product.name}
      imageUrl={product.heroImageUrl}
      imageAlt={product.name}
      shellColor={product.previewColor ?? undefined}
      placeholderTestId="trending-product-card-placeholder"
      overlayTopRight={
        showWishlistButton ? (
          <WishlistButton
            api={wishlistApi}
            className="absolute right-3.5 top-3.5 z-20"
            productId={product.id}
          />
        ) : undefined
      }
      articleClassName={articleClassName}
      articleProps={articleProps ?? { 'data-testid': 'trending-product-card' }}
      metaTop={<TrendingProductTags tags={product.tags} size="md" />}
      bylineWrapperTestId="trending-product-footer-row"
      creatorName={product.creatorName}
      creatorAvatarUrl={product.creatorAvatarUrl}
      collaborators={product.collaborators}
      priceStripeProps={{
        'data-testid': 'trending-product-price',
        'aria-label': `Price ${priceDisplay}`,
      }}
      footerLeft={
        <Link
          to={productHref}
          className="inline-flex rounded-md text-left text-[1rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {priceDisplay}
        </Link>
      }
      footerRight={
        product.averageRating != null ? (
          <span
            className="inline-flex items-center gap-1 text-[0.625rem] font-medium leading-none tabular-nums text-muted-foreground"
            aria-label={`${product.averageRating.toFixed(1)} rating${product.reviewCount != null && product.reviewCount > 0 ? `, ${product.reviewCount} reviews` : ''}`}
          >
            <Icon name="star-filled" size={12} className="text-amber-400" />
            <span className="font-semibold text-foreground/82">{product.averageRating.toFixed(1)}</span>
            {product.reviewCount != null && product.reviewCount > 0
              ? (
                <>
                  <span className="text-foreground/35" aria-hidden>
                    ·
                  </span>
                  <span className="text-foreground/42">{product.reviewCount.toLocaleString('en-US')}</span>
                </>
              )
              : null}
          </span>
        ) : null
      }
    />
  );
}
