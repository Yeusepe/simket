/**
 * Purpose: Discovery recommendation tile rendered via the same component as Trending.
 */
import { ProductTileCardSkeleton } from '../product-tile';
import { TrendingProductCard } from '../today/TrendingProductCard';
import type { DiscoveryFeedItem } from './discovery-types';

export interface DiscoveryCardProps {
  readonly item: DiscoveryFeedItem;
}

export function DiscoveryCard({ item }: DiscoveryCardProps) {
  return (
    <TrendingProductCard
      product={item.product}
      href={`/product/${item.product.slug}`}
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
