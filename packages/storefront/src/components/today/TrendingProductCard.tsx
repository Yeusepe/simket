/**
 * Purpose: Today “Trending” carousel tile — minimal layout on {@link ProductTileCard}.
 * Tests:
 *   - packages/storefront/src/components/today/TrendingProductCard.test.tsx
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { JSX } from 'react';

import type { ProductListItem } from '../../types/product';
import type { WishlistApi } from '../../types/wishlist';
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
  readonly articleProps?: JSX.IntrinsicElements['article'];
}

export function TrendingProductCard({
  product,
  href,
  wishlistApi,
  showWishlistButton = true,
  articleClassName,
  articleProps,
}: TrendingProductCardProps) {
  const navigate = useNavigate();

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
        <button
          type="button"
          className="cursor-pointer rounded-md py-0.5 text-left text-base font-semibold tabular-nums text-foreground underline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onClick={() => {
            navigate(productHref);
          }}
        >
          {priceDisplay}
        </button>
      }
      footerRight={
        product.averageRating != null ? (
          <span
            className="text-xs tabular-nums text-muted-foreground"
            aria-label={`${product.averageRating.toFixed(1)} rating${product.reviewCount != null && product.reviewCount > 0 ? `, ${product.reviewCount} reviews` : ''}`}
          >
            {product.averageRating.toFixed(1)}
            {product.reviewCount != null && product.reviewCount > 0
              ? ` · ${product.reviewCount.toLocaleString('en-US')}`
              : ''}
          </span>
        ) : null
      }
    />
  );
}
