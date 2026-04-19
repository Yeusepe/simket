/**
 * Purpose: Loading placeholder matching {@link ProductTileCard} geometry.
 */
import { Skeleton } from '@heroui/react';

export function ProductTileCardSkeleton() {
  return (
    <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] bg-content1">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-3 px-4 pb-4 pt-4">
        <Skeleton className="h-5 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
        <Skeleton className="h-6 w-full rounded-full" />
        <Skeleton className="h-4 w-1/3 rounded-lg" />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-divider px-4 pb-4 pt-4">
        <Skeleton className="h-6 w-16 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
    </article>
  );
}
