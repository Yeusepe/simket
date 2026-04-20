/**
 * Purpose: Loading placeholder matching {@link ProductTileCard} stacked layout.
 */
import { Skeleton } from '@heroui/react';

export function ProductTileCardSkeleton() {
  return (
    <article className="flex h-full min-h-0 flex-col overflow-visible">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.35rem]"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--store-bg, var(--simket-bg, var(--background))) 78%, var(--store-subtle, var(--simket-subtle, var(--surface))) 22%)',
        }}
      >
        <div>
          <Skeleton className="aspect-square w-full shrink-0 rounded-t-[1.35rem] rounded-b-none" />
        </div>
        <div className="px-4 pb-3 pt-2.5">
          <Skeleton className="h-5 w-4/5 rounded-lg" />
          <div className="mt-2.5 space-y-2">
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-2/3 rounded-md" />
          </div>
        </div>
        <div className="px-4 pb-4 pt-0">
          <div className="flex items-center justify-between gap-2 pt-1.5">
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </div>
        </div>
      </div>
    </article>
  );
}
