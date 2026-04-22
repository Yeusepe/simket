/**
 * Purpose: HeroUI Pro carousel for non-editorial trending tiles.
 * Governing docs:
 *   - docs/architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/carousel
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/today/ProductHorizontalScroll.test.tsx
 */
import { Carousel } from '@heroui-pro/react/carousel';

import type { ProductListItem } from '../../types/product';
import { Icon } from '../common/Icon';
import { TrendingProductCard } from './TrendingProductCard';

const CAROUSEL_NAVIGATION_BUTTON_CLASS =
  'transition-opacity data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-0';

export interface ProductHorizontalScrollProps {
  readonly title: string;
  readonly products: readonly ProductListItem[];
}

export function ProductHorizontalScroll({ title, products }: ProductHorizontalScrollProps) {
  return (
    <section aria-label={title} className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h3>
      </div>

      <Carousel
        className="storefront-product-carousel space-y-5 pt-2"
        opts={{ align: 'start', dragFree: products.length > 3, loop: products.length > 3 }}
      >
        <Carousel.Content
          data-testid="product-horizontal-scroll-track"
          className="carousel__content--horizontal items-stretch"
        >
          {products.map((product) => (
            <Carousel.Item
              key={product.id}
              className="carousel__item--horizontal basis-[82%] sm:basis-[56%] lg:basis-[36%] xl:basis-[27%]"
            >
              <div className="flex h-full">
                <TrendingProductCard articleClassName="w-full" product={product} />
              </div>
            </Carousel.Item>
          ))}
        </Carousel.Content>

        {products.length > 1 && (
          <>
            <Carousel.Previous
              aria-label="Previous trending product"
              className={CAROUSEL_NAVIGATION_BUTTON_CLASS}
              variant="outline"
              icon={<Icon name="arrow-left" size={16} />}
            />
            <Carousel.Next
              aria-label="Next trending product"
              className={CAROUSEL_NAVIGATION_BUTTON_CLASS}
              variant="outline"
              icon={<Icon name="arrow-right" size={16} />}
            />
            <Carousel.Dots className="mt-0 pt-1" />
          </>
        )}
      </Carousel>
    </section>
  );
}
