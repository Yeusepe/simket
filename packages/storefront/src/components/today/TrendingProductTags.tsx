/**
 * Purpose: Compact taxonomy row for product tiles.
 */
import { cn } from '@/lib/utils';

const MAX_VISIBLE = 2;

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
        'flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap',
        isMd ? 'min-h-[0.875rem]' : isXs ? 'min-h-[0.75rem]' : 'min-h-[0.875rem]',
        className,
      )}
      data-testid="trending-product-tags"
      aria-label="Tags"
    >
      {visible.map((tag, index) => (
        <div key={tag} className="inline-flex min-w-0 shrink items-center gap-1.5">
          {index > 0 ? (
            <span className="shrink-0 text-foreground/28" aria-hidden>
              ·
            </span>
          ) : null}
          <span
            className={cn(
              'min-w-0 truncate uppercase text-foreground/52',
              isMd
                ? 'text-[0.58rem] font-semibold leading-none tracking-[0.14em]'
                : isXs
                  ? 'text-[0.375rem] leading-none tracking-[0.12em]'
                  : 'text-[0.5rem] font-semibold leading-none tracking-[0.12em]',
            )}
            title={tag}
          >
            {tag}
          </span>
        </div>
      ))}
      {overflow > 0 ? (
        <>
          {visible.length > 0 ? (
            <span className="shrink-0 text-foreground/28" aria-hidden>
              ·
            </span>
          ) : null}
          <span
            className={cn(
              'shrink-0 font-semibold tabular-nums text-foreground/38',
              isMd
                ? 'text-[0.625rem] leading-none'
                : isXs
                  ? 'text-[0.375rem] leading-none'
                  : 'text-[0.5rem] leading-none',
            )}
            title={`${overflow} more tags`}
          >
            +{overflow}
          </span>
        </>
      ) : null}
    </div>
  );
}
