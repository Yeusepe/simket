/**
 * Purpose: Library page — shows the buyer's purchased products (inventory).
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront, §7 HeroUI)
 *   - docs/domain-model.md (Order entity)
 * External references:
 *   - https://heroui.com/docs/react/components/card
 *   - https://heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/pages/LibraryPage.test.tsx
 */
import { Button, Card, Spinner } from '@heroui/react';
import { useMemo, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { useLibrary } from '../hooks/use-library';
import type { LibraryApi } from '../hooks/use-library';

interface LibraryPageProps {
  readonly api?: LibraryApi;
  readonly initialPage?: number;
  readonly limit?: number;
}

export function LibraryPage({
  api,
  initialPage = 1,
  limit = 12,
}: LibraryPageProps) {
  const [page, setPage] = useState(initialPage);
  const { library, error, isLoading } = useLibrary({ api, page, limit });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(library.totalItems / Math.max(1, library.limit))),
    [library.limit, library.totalItems],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">My Library</h1>
        <p className="text-muted-foreground">
          All the products you've purchased. Download, access, and manage your collection.
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
      ) : library.items.length === 0 ? (
        <Card>
          <Card.Header>
            <Card.Title>Your library is empty</Card.Title>
            <Card.Description>
              Products you purchase will appear here. Browse the store to find something you love.
            </Card.Description>
          </Card.Header>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {library.items.map((item) => (
              <div key={item.orderId + item.product.id} className="space-y-2">
                <ProductCard product={item.product} showWishlistButton={false} />
                <p className="text-xs text-muted-foreground">
                  Purchased on {new Date(item.orderDate).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Page {library.page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  aria-label="Previous page"
                  isDisabled={page <= 1}
                  size="sm"
                  variant="ghost"
                  onPress={() => setPage((c) => Math.max(1, c - 1))}
                >
                  Previous
                </Button>
                <Button
                  aria-label="Next page"
                  isDisabled={page >= totalPages}
                  size="sm"
                  variant="secondary"
                  onPress={() => setPage((c) => Math.min(totalPages, c + 1))}
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

