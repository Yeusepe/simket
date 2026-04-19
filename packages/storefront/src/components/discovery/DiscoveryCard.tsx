/**
 * Purpose: Discovery recommendation tile — thin wrapper around {@link ProductTileCard}
 * with reason chip, match score, and quick add-to-cart.
 *
 * Governing docs:
 *   - docs/architecture.md (§6 storefront discovery, §7 HeroUI everywhere)
 *   - docs/domain-model.md (§4.1 Product)
 * Tests:
 *   - packages/storefront/src/components/discovery/DiscoveryCard.test.tsx
 */

import { Button, Chip } from '@heroui/react';

import { useCartState } from '../../state/cart-state';
import { ProductCreatorsByline } from '../creators';
import { ProductTileCard, ProductTileCardSkeleton } from '../product-tile';
import { formatPrice } from '../ProductCard';
import type { DiscoveryFeedItem } from './discovery-types';

export interface DiscoveryCardProps {
  readonly item: DiscoveryFeedItem;
}

export function DiscoveryCard({ item }: DiscoveryCardProps) {
  const addItem = useCartState((state) => state.addItem);
  const productHref = `/product/${item.slug}`;

  return (
    <ProductTileCard
      shellColor={item.previewColor}
      productHref={productHref}
      title={item.name}
      imageUrl={item.imageUrl}
      imageAlt={item.name}
      shellAccent={item.previewColor}
      articleProps={{
        'data-testid': 'discovery-card',
        'data-discovery-size': 'medium',
      }}
      linkBodyExtra={({ footerColors, shellColor }) => (
        <>
          <div data-testid="discovery-product-byline">
            <ProductCreatorsByline
              creatorName={item.creatorName}
              footerColors={footerColors}
              shellColor={shellColor}
              showRoleIcons={false}
              density="comfortable"
            />
          </div>
          <Chip variant="soft" size="sm" className="w-fit max-w-full border-0 shadow-none">
            <Chip.Label className="line-clamp-2 text-left" style={{ color: footerColors.creator }}>
              {item.reason}
            </Chip.Label>
          </Chip>
          <p className="text-xs tabular-nums" style={{ color: footerColors.creator }}>
            Match score {Math.round(item.score * 100)}%
          </p>
        </>
      )}
      priceSection={({ footerColors }) => (
        <div className="flex w-full items-center justify-between gap-3">
          <span
            className="text-base font-semibold tabular-nums sm:text-lg"
            style={{ color: footerColors.product }}
          >
            {formatPrice(item.price, item.currencyCode)}
          </span>
          <Button
            size="sm"
            variant="primary"
            className="shrink-0 rounded-full border-0 shadow-none"
            style={{
              backgroundColor: footerColors.ctaBackground,
              color: footerColors.ctaForeground,
            }}
            onPress={() => {
              addItem({
                productId: item.productId,
                variantId: item.variantId,
                name: item.name,
                price: item.price,
                currencyCode: item.currencyCode,
                quantity: 1,
                heroImageUrl: item.imageUrl,
                slug: item.slug,
              });
            }}
          >
            Add to cart
          </Button>
        </div>
      )}
    />
  );
}

export function DiscoveryCardSkeleton() {
  return (
    <div data-testid="discovery-card-skeleton">
      <ProductTileCardSkeleton />
    </div>
  );
}
