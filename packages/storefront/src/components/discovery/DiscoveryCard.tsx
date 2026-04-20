/**
 * Purpose: Discovery recommendation tile rendered via the same component as Trending.
 */
import { ProductTileCardSkeleton } from '../product-tile';
import type { ProductListItem } from '../../types/product';
import { TrendingProductCard } from '../today/TrendingProductCard';
import type { DiscoveryFeedItem } from './discovery-types';

export interface DiscoveryCardProps {
  readonly item: DiscoveryFeedItem;
}

export function DiscoveryCard({ item }: DiscoveryCardProps) {
  const productForTile: ProductListItem = {
    id: item.productId,
    slug: item.slug,
    name: item.name,
    description: item.reason,
    priceMin: item.price,
    priceMax: item.price,
    currencyCode: item.currencyCode,
    heroImageUrl: item.imageUrl,
    heroTransparentUrl: null,
    creatorName: item.creatorName,
    creatorAvatarUrl: null,
    collaborators: [],
    tags: [item.source],
    categorySlug: null,
    averageRating: Math.max(0, Math.min(5, item.score * 5)),
    reviewCount: null,
    previewColor: item.previewColor ?? null,
  };

  return (
    <TrendingProductCard
      product={productForTile}
      href={`/product/${item.slug}`}
      showWishlistButton={false}
      articleClassName="mx-auto w-64"
      articleProps={{ 'data-testid': 'discovery-card', 'data-discovery-size': 'medium' }}
    />
  );
}

export function DiscoveryCardSkeleton() {
  return (
    <div data-testid="discovery-card-skeleton" className="mx-auto w-64">
      <ProductTileCardSkeleton />
    </div>
  );
}
