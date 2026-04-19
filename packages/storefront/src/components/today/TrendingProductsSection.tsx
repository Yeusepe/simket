/**
 * Purpose: Today row for `slug === 'trending'` — real products from the catalog, not editorial cards.
 * Governing docs:
 *   - docs/architecture.md
 */
import { Skeleton } from '@heroui/react';

import { useTrendingProducts } from '../../hooks/use-trending-products';
import { ProductHorizontalScroll } from './ProductHorizontalScroll';

export interface TrendingProductsSectionProps {
  readonly title: string;
}

export function TrendingProductsSection({ title }: TrendingProductsSectionProps) {
  const { data: products, isLoading, isError } = useTrendingProducts();

  if (isLoading) {
    return (
      <section aria-label={title} className="space-y-4">
        <Skeleton className="h-7 w-48 rounded-lg bg-primary/20" />
        <div className="flex items-stretch gap-4 overflow-hidden pl-8 md:pl-14">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex w-64 flex-none flex-col self-stretch overflow-hidden rounded-[2rem] bg-gradient-to-b from-primary/15 to-secondary/10 shadow-sm"
            >
              <Skeleton className="aspect-square w-full shrink-0 rounded-none bg-gradient-to-br from-primary/30 to-secondary/25" />
              <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-3">
                <Skeleton className="h-5 w-4/5 rounded-md bg-default-300/80" />
                <div className="flex gap-1">
                  <Skeleton className="h-3.5 w-10 rounded-full bg-primary/25" />
                  <Skeleton className="h-3.5 w-11 rounded-full bg-secondary/30" />
                </div>
                <Skeleton className="h-4 w-full rounded-md bg-default-300/70" />
                <Skeleton className="h-4 w-24 rounded-md bg-amber-400/35" />
                <Skeleton className="h-8 w-24 rounded-md bg-primary/30" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isError || !products?.length) {
    return (
      <section aria-label={title} className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-default-500">Products aren&apos;t available right now.</p>
      </section>
    );
  }

  return <ProductHorizontalScroll title={title} products={products} />;
}
