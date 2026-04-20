/**
 * Purpose: Tag chips for trending tiles — soft pills, no outlines.
 */
import { cn } from '@/lib/utils';

const MAX_VISIBLE = 3;

export interface TrendingProductTagsProps {
  readonly tags: readonly string[];
  readonly size?: 'md' | 'sm' | 'xs';
  readonly className?: string;
}

export function TrendingProductTags({ tags, size = 'sm', className }: TrendingProductTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  const visible = tags.slice(0, MAX_VISIBLE);
  const overflow = tags.length - visible.length;

  const isXs = size === 'xs';
  const isMd = size === 'md';

  return (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1',
        isMd ? 'min-h-0' : isXs ? 'min-h-[0.75rem]' : 'min-h-[1.125rem]',
        className,
      )}
      data-testid="trending-product-tags"
      aria-label="Tags"
    >
      {visible.map((tag) => (
        <span
          key={tag}
          className={cn(
            'inline-flex max-w-full rounded-full bg-muted/50 break-words text-left text-muted-foreground uppercase tracking-wide whitespace-normal',
            isMd
              ? 'px-2 py-0.5 text-[0.625rem] font-medium leading-snug'
              : isXs
                ? 'px-1 py-0 text-[0.375rem] leading-snug'
                : 'px-1.5 py-px text-[0.5rem] font-medium leading-snug',
          )}
        >
          {tag}
        </span>
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            'shrink-0 rounded-full font-medium text-muted-foreground tabular-nums',
            isMd ? 'px-1 py-0.5 text-[0.625rem] leading-none' : isXs ? 'px-0.5 py-0 text-[0.375rem] leading-none' : 'px-1 py-px text-[0.5rem]',
          )}
          title={`${overflow} more tags`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
