/**
 * Purpose: Render the paginated wishlist grid with remove actions and empty states.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/docs/react/components/button
 *   - https://heroui.com/docs/react/components/card
 *   - https://heroui.com/docs/react/components/badge
 * Tests:
 *   - packages/storefront/src/components/wishlist/WishlistPage.test.tsx
 */
import { Badge, Button, Card, Spinner } from '@heroui/react';
import { useMemo, useState } from 'react';
import { ProductCard } from '../ProductCard';
import { useWishlist } from '../../hooks/useWishlist';
import type { WishlistApi } from '../../types/wishlist';

interface WishlistPageProps {
  readonly api?: WishlistApi;
  readonly initialPage?: number;
  readonly limit?: number;
}

export function WishlistPage({
  api,
  initialPage = 1,
  limit = 12,
}: WishlistPageProps) {
  const [page, setPage] = useState(initialPage);
  const { wishlist, error, isLoading, isMutating, removeFromWishlist } = useWishlist({
    api,
    page,
    limit,
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(wishlist.totalItems / Math.max(1, wishlist.limit))),
    [wishlist.limit, wishlist.totalItems],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Your wishlist</h1>
        <p className="text-muted-foreground">
          Save products for later and keep an eye on future price drops.
        </p>
      </div>

      {error ? (
        <Card>
          <Card.Content className="p-6">
            <p className="text-sm text-danger">{error.message}</p>
          </Card.Content>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : wishlist.items.length === 0 ? (
        <Card>
          <Card.Header>
            <Card.Title>Your wishlist is empty</Card.Title>
            <Card.Description>
              Add products you want to revisit later from any product card or detail page.
            </Card.Description>
          </Card.Header>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {wishlist.items.map((item) => (
              <div key={item.id} className="space-y-3">
                <ProductCard product={item.product} showWishlistButton={false} />
                <div className="flex items-center justify-between gap-3">
                  {item.notifyOnPriceDrop ? (
                    <Badge color="success" variant="soft">
                      Price alerts on
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Saved on {new Date(item.addedAt).toLocaleDateString()}
                    </span>
                  )}
                  <Button
                    aria-label={`Remove ${item.product.name} from wishlist`}
                    isDisabled={isMutating}
                    size="sm"
                    variant="danger"
                    onPress={() => void removeFromWishlist(item.productId)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Page {wishlist.page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  aria-label="Previous page"
                  isDisabled={page <= 1}
                  size="sm"
                  variant="ghost"
                  onPress={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  aria-label="Next page"
                  isDisabled={page >= totalPages}
                  size="sm"
                  variant="secondary"
                  onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
