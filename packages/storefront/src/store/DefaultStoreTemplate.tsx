/**
 * Purpose: Render the fallback creator-store homepage when no custom Framely pages have been published yet.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront, §5 Framely integration)
 *   - docs/domain-model.md (§1 Product)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§2 readability)
 * External references:
 *   - https://heroui.com/docs/react/components/card
 *   - https://heroui.com/docs/react/components/avatar
 * Tests:
 *   - packages/storefront/src/store/StoreLayout.test.tsx
 */
import { Avatar, Card } from '@heroui/react';
import { ProductCard } from '../components/ProductCard';
import { toProductListItem } from './store-service';
import { useStore } from './use-store';

export function DefaultStoreTemplate() {
  const { store, hrefs } = useStore();

  return (
    <div className="space-y-8">
      <Card variant="secondary">
        <Card.Content className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <Avatar className="size-20">
            {store.creator.avatarUrl ? (
              <Avatar.Image src={store.creator.avatarUrl} alt={store.creator.displayName} />
            ) : null}
            <Avatar.Fallback>{store.creator.displayName.slice(0, 2).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">{store.creator.displayName}</h1>
            <p className="text-base text-muted-foreground">{store.creator.tagline}</p>
            <p className="text-sm text-muted-foreground">{store.creator.bio}</p>
          </div>
        </Card.Content>
      </Card>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Featured products</h2>
        <p className="text-muted-foreground">
          No custom landing page yet. Browse the store catalog below.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {store.products.map((product) => (
          <ProductCard
            key={product.id}
            product={toProductListItem(product)}
            href={hrefs.product(product.slug)}
          />
        ))}
      </div>
    </div>
  );
}
