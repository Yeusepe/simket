/**
 * Purpose: Render a horizontally scrollable Today row with CSS snap points and
 * hover-revealed navigation arrows.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/today/HorizontalScroll.test.tsx
 */
import { Button } from '@heroui/react';
import { useRef } from 'react';
import { EditorialCard } from './EditorialCard';
import type { EditorialItem } from './today-types';

interface HorizontalScrollProps {
  readonly title: string;
  readonly items: readonly EditorialItem[];
}

export function HorizontalScroll({ title, items }: HorizontalScrollProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollTrack = (direction: 'left' | 'right') => {
    trackRef.current?.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  return (
    <section aria-label={title} className="group relative space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
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
        data-testid="horizontal-scroll-track"
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div key={item.id} className="min-w-[18rem] flex-none snap-start md:w-[20rem]">
            <EditorialCard item={item} />
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
