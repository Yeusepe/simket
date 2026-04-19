/**
 * Purpose: HeroUI recommendation card for a single discovery feed item with a
 * quick add-to-cart action.
 *
 * Governing docs:
 *   - docs/architecture.md (§6 storefront discovery, §7 HeroUI everywhere)
 *   - docs/domain-model.md (§4.1 Product)
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 *   - https://www.heroui.com/docs/react/components/chip
 * Tests:
 *   - packages/storefront/src/components/discovery/DiscoveryCard.test.tsx
 */

import { Button, Card, Chip, Skeleton } from '@heroui/react';

import { useCartState } from '../../state/cart-state';
import { formatPrice } from '../ProductCard';
import type { DiscoveryFeedItem } from './discovery-types';

export interface DiscoveryCardProps {
  readonly item: DiscoveryFeedItem;
}

export function DiscoveryCard({ item }: DiscoveryCardProps) {
  const addItem = useCartState((state) => state.addItem);
  const accent = item.previewColor ?? null;

  return (
    <Card
      data-discovery-size="medium"
      className={`flex h-full min-h-0 flex-col overflow-hidden ${accent ? 'border-l-4 border-solid' : ''}`}
      style={accent ? { borderLeftColor: accent } : undefined}
    >
      <div
        className="aspect-square shrink-0 overflow-hidden bg-muted"
        style={
          !item.imageUrl && accent
            ? { background: `linear-gradient(145deg, color-mix(in srgb, ${accent} 42%, transparent), color-mix(in srgb, ${accent} 12%, transparent))` }
            : undefined
        }
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image available
          </div>
        )}
      </div>

      <Card.Header className="pb-2">
        <Card.Title className="line-clamp-1 text-base">{item.name}</Card.Title>
        <Card.Description className="text-sm text-muted-foreground">
          {item.creatorName}
        </Card.Description>
      </Card.Header>

      <Card.Content className="flex flex-1 flex-col gap-3 pt-0">
        <Chip variant="soft" size="sm">
          <Chip.Label>{item.reason}</Chip.Label>
        </Chip>
        <p className="text-xs text-muted-foreground">
          Match score {Math.round(item.score * 100)}%
        </p>
      </Card.Content>

      <Card.Footer className="flex items-center justify-between gap-3 pt-0">
        <span className="font-semibold">
          {formatPrice(item.price, item.currencyCode)}
        </span>
        <Button
          size="sm"
          variant="primary"
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
      </Card.Footer>
    </Card>
  );
}

export function DiscoveryCardSkeleton() {
  return (
    <div data-testid="discovery-card-skeleton">
      <Card className="flex h-full flex-col overflow-hidden">
        <Skeleton className="aspect-square w-full rounded-none" />
        <Card.Header className="pb-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-1 h-4 w-1/2" />
        </Card.Header>
        <Card.Content className="space-y-2 pt-0">
          <Skeleton className="h-5 w-full rounded-full" />
          <Skeleton className="h-4 w-1/3" />
        </Card.Content>
        <Card.Footer className="flex items-center justify-between gap-3 pt-0">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </Card.Footer>
      </Card>
    </div>
  );
}
