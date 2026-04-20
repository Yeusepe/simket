/**
 * Purpose: Loading placeholder matching {@link ProductTileCard} stacked layout.
 */
import { Skeleton } from '@heroui/react';

export function ProductTileCardSkeleton() {
  return (
    <article className="flex h-full min-h-0 flex-col overflow-visible">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-default-200/65 bg-gradient-to-b from-default-100/35 via-background to-background dark:border-default-600/50 dark:from-default-900/60 dark:via-background dark:to-background">
        <Skeleton className="aspect-[4/5] w-full shrink-0 rounded-[0.875rem]" />
        <div className="px-3.5 pb-3 pt-3.5">
          <Skeleton className="h-5 w-4/5 rounded-lg" />
          <div className="mt-2 space-y-2">
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-2/3 rounded-md" />
          </div>
        </div>
        <div className="border-t border-default-200/50 px-3.5 pb-2.5 pt-2 dark:border-default-600/40">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>
      </div>
    </article>
  );
}
