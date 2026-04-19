/**
 * Purpose: Horizontally scrollable trending tiles (`TrendingProductCard`, same snap/track UX as `HorizontalScroll`).
 * Governing docs:
 *   - docs/architecture.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/today/ProductHorizontalScroll.test.tsx
 */
import { Button } from '@heroui/react';
import { useRef } from 'react';

import type { ProductListItem } from '../../types/product';
import { TrendingProductCard } from './TrendingProductCard';

/** Trending tiles (`w-64`); scroll step = width + `gap-4`. */
const TRENDING_CARD_WIDTH_PX = 256;
const TRENDING_TRACK_GAP_PX = 16;

export interface ProductHorizontalScrollProps {
  readonly title: string;
  readonly products: readonly ProductListItem[];
}

export function ProductHorizontalScroll({ title, products }: ProductHorizontalScrollProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollStep = TRENDING_CARD_WIDTH_PX + TRENDING_TRACK_GAP_PX;

  const scrollTrack = (direction: 'left' | 'right') => {
    trackRef.current?.scrollBy({
      left: direction === 'left' ? -scrollStep : scrollStep,
      behavior: 'smooth',
    });
  };

  return (
    <section aria-label={title} className="group relative space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h3>
      </div>

      <Button
        aria-label="Scroll left"
        isIconOnly
        variant="secondary"
        onPress={() => scrollTrack('left')}
        className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 md:inline-flex"
      >
        <span aria-hidden="true">←</span>
      </Button>

      <div
        ref={trackRef}
        data-testid="product-horizontal-scroll-track"
        className="flex items-stretch snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pl-8 scroll-pl-8 [scrollbar-width:none] md:pl-14 md:scroll-pl-14 [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div key={product.id} className="flex w-64 flex-none snap-start self-stretch">
            <TrendingProductCard product={product} />
          </div>
        ))}
      </div>

      <Button
        aria-label="Scroll right"
        isIconOnly
        variant="secondary"
        onPress={() => scrollTrack('right')}
        className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 md:inline-flex"
      >
        <span aria-hidden="true">→</span>
      </Button>
    </section>
  );
}
