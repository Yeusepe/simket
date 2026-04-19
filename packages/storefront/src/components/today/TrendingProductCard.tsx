/**
 * Purpose: Today “Trending” carousel tile — thin wrapper around {@link ProductTileCard}.
 * Governing docs:
 *   - docs/architecture.md
 * Tests:
 *   - packages/storefront/src/components/today/TrendingProductCard.test.tsx
 */
import { Button } from '@heroui/react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ProductListItem } from '../../types/product';
import type { WishlistApi } from '../../types/wishlist';
import { ProductCreatorsByline } from '../creators';
import { ProductTileCard } from '../product-tile';
import { WishlistButton } from '../wishlist';
import { formatPrice } from '../ProductCard';
import { TrendingProductTags } from './TrendingProductTags';

export interface TrendingProductCardProps {
  readonly product: ProductListItem;
  readonly href?: string;
  readonly wishlistApi?: WishlistApi;
  readonly showWishlistButton?: boolean;
}

export function TrendingProductCard({
  product,
  href,
  wishlistApi,
  showWishlistButton = true,
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
    <ProductTileCard
      shellColor={product.previewColor}
      productHref={productHref}
      title={product.name}
      imageUrl={product.heroImageUrl}
      imageAlt={product.name}
      shellAccent={product.previewColor}
      placeholderTestId="trending-product-card-placeholder"
      overlayTopRight={
        showWishlistButton ? (
          <WishlistButton
            api={wishlistApi}
            className="absolute right-3 top-3 z-20"
            productId={product.id}
          />
        ) : undefined
      }
      articleProps={{ 'data-testid': 'trending-product-card' }}
      priceStripeProps={{
        'data-testid': 'trending-product-price',
        'aria-label': `Price ${priceDisplay}`,
      }}
      linkBodyExtra={({ footerColors, shellColor }) => (
        <>
          <TrendingProductTags tags={product.tags} footerColors={footerColors} size="md" />
          <div data-testid="trending-product-footer-row">
            <ProductCreatorsByline
              creatorName={product.creatorName}
              creatorAvatarUrl={product.creatorAvatarUrl}
              collaborators={product.collaborators}
              footerColors={footerColors}
              shellColor={shellColor}
              showRoleIcons={false}
              density="comfortable"
            />
          </div>
        </>
      )}
      priceSection={({ footerColors }) => (
        <Button
          type="button"
          size="lg"
          variant="primary"
          className="h-auto min-h-0 w-full justify-start rounded-xl border-0 px-0 py-1 text-left font-semibold tabular-nums shadow-none sm:text-lg"
          style={{
            backgroundColor: 'transparent',
            color: footerColors.ctaForeground,
          }}
          onPress={() => {
            navigate(productHref);
          }}
        >
          {priceDisplay}
        </Button>
      )}
    />
  );
}
