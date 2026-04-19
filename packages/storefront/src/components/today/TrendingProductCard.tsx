/**
 * Purpose: Today “Trending” carousel tile — rounded shell, square hero, Leonardo body,
 * tags, byline, optional rating; price pinned to bottom for aligned heights.
 * Governing docs:
 *   - docs/architecture.md
 * Tests:
 *   - packages/storefront/src/components/today/TrendingProductCard.test.tsx
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { createBentoSpotlightFooterColors } from '../../color/leonardo-theme';
import type { ProductListItem } from '../../types/product';
import type { WishlistApi } from '../../types/wishlist';
import { ProductCreatorsByline } from '../creators';
import { WishlistButton } from '../wishlist';
import { DEFAULT_BENTO_SHELL_COLOR } from './BentoHeroFrame';
import { formatPrice } from '../ProductCard';
import { TrendingProductRating } from './TrendingProductRating';
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
  const shellColor = product.previewColor ?? DEFAULT_BENTO_SHELL_COLOR;
  const footerColors = useMemo(() => createBentoSpotlightFooterColors(shellColor), []);

  const hasPriceRange = product.priceMin !== product.priceMax;
  const priceDisplay = hasPriceRange
    ? `${formatPrice(product.priceMin, product.currencyCode)} – ${formatPrice(product.priceMax, product.currencyCode)}`
    : formatPrice(product.priceMin, product.currencyCode);

  const rating =
    product.averageRating != null && product.averageRating > 0 ? product.averageRating : null;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      {showWishlistButton ? (
        <WishlistButton
          api={wishlistApi}
          className="absolute right-3 top-3 z-20"
          productId={product.id}
        />
      ) : null}
      <Link
        to={href ?? `/product/${product.slug}`}
        className="flex h-full min-h-0 flex-1 flex-col focus-visible:outline-none"
      >
        <article
          data-testid="trending-product-card"
          className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-content1 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-content1">
            {product.heroImageUrl ? (
              <img
                src={product.heroImageUrl}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="lazy"
              />
            ) : (
              <div
                data-testid="trending-product-card-placeholder"
                className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/35 via-secondary/25 to-primary/50"
                style={
                  product.previewColor
                    ? {
                        background: `linear-gradient(145deg, color-mix(in srgb, ${product.previewColor} 55%, white), color-mix(in srgb, ${product.previewColor} 18%, white))`,
                      }
                    : undefined
                }
              >
                <span className="text-xs font-medium text-foreground/80">No image</span>
              </div>
            )}
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col px-3 py-3"
            data-bento-text-themed="leonardo"
            style={{ backgroundColor: shellColor }}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <h3
                className="line-clamp-2 shrink-0 text-left text-sm font-bold leading-snug tracking-tight text-balance sm:text-base"
                style={{ color: footerColors.product }}
                title={product.name}
              >
                {product.name}
              </h3>
              <TrendingProductTags tags={product.tags} footerColors={footerColors} size="md" />
              <div className="min-w-0 shrink-0" data-testid="trending-product-footer-row">
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
              <div className="min-h-[1.25rem] shrink-0">
                {rating != null ? (
                  <TrendingProductRating
                    averageRating={rating}
                    reviewCount={product.reviewCount}
                    footerColors={footerColors}
                  />
                ) : null}
              </div>
              <div className="min-h-0 flex-1" aria-hidden="true" />
              <section
                data-testid="trending-product-price"
                aria-label="Price"
                className="w-full shrink-0 border-t border-black/10 pt-3 text-left dark:border-white/15"
              >
                <h4
                  className="mb-0.5 text-[0.65rem] font-semibold uppercase tracking-wider"
                  style={{ color: footerColors.creator }}
                >
                  Price
                </h4>
                <p
                  className="text-base font-semibold tabular-nums sm:text-lg"
                  style={{ color: footerColors.ctaForeground }}
                >
                  {priceDisplay}
                </p>
              </section>
            </div>
          </div>
        </article>
      </Link>
    </div>
  );
}
