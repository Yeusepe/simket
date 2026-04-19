/**
 * Purpose: Tag chips for trending tiles — wraps without clipping; shows +N overflow.
 * Governing docs:
 *   - docs/architecture.md
 */
import type { BentoSpotlightFooterColors } from '../../color/leonardo-theme';

const MAX_VISIBLE = 3;

export interface TrendingProductTagsProps {
  readonly tags: readonly string[];
  readonly footerColors: BentoSpotlightFooterColors;
  /** `md` = trending default; `sm`; `xs` = most compact. */
  readonly size?: 'md' | 'sm' | 'xs';
  readonly className?: string;
}

export function TrendingProductTags({
  tags,
  footerColors,
  size = 'sm',
  className,
}: TrendingProductTagsProps) {
  if (tags.length === 0) {
    return null;
  }

  const visible = tags.slice(0, MAX_VISIBLE);
  const overflow = tags.length - visible.length;

  const isXs = size === 'xs';
  const isMd = size === 'md';

  return (
    <div
      className={`flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 ${
        isMd ? 'min-h-[1rem]' : isXs ? 'min-h-[0.75rem]' : 'min-h-[1.125rem]'
      } ${className ?? ''}`}
      data-testid="trending-product-tags"
      aria-label="Tags"
    >
      {visible.map((tag) => (
        <span
          key={tag}
          className={`inline-flex max-w-full rounded-full border font-semibold uppercase tracking-wider break-words text-left whitespace-normal ${
            isMd
              ? 'px-1.5 py-0.5 text-[0.625rem] leading-snug'
              : isXs
                ? 'px-0.5 py-0 text-[0.375rem] leading-snug'
                : 'px-1.5 py-px text-[0.5rem] leading-snug'
          }`}
          style={{
            color: footerColors.creator,
            borderColor: `color-mix(in srgb, ${footerColors.creator} 42%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${footerColors.product} 14%, transparent)`,
          }}
        >
          {tag}
        </span>
      ))}
      {overflow > 0 ? (
        <span
          className={`shrink-0 rounded-full font-medium tabular-nums ${
            isMd ? 'px-1 py-0.5 text-[0.625rem] leading-none' : isXs ? 'px-0.5 py-0 text-[0.375rem] leading-none' : 'px-1 py-px text-[0.5rem]'
          }`}
          style={{ color: footerColors.creator }}
          title={`${overflow} more tags`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
