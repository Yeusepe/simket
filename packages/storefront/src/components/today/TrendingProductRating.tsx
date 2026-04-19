/**
 * Purpose: Compact star row + review count for trending product tiles (filled = amber star icons).
 * Governing docs:
 *   - docs/architecture.md
 */
import type { BentoSpotlightFooterColors } from '../../color/leonardo-theme';
import { Icon } from '../common/Icon';

export interface TrendingProductRatingProps {
  /** 0–5; values outside range are clamped. */
  readonly averageRating: number;
  readonly reviewCount?: number | null;
  readonly footerColors: BentoSpotlightFooterColors;
}

export function TrendingProductRating({
  averageRating,
  reviewCount,
  footerColors,
}: TrendingProductRatingProps) {
  const clamped = Math.max(0, Math.min(5, averageRating));
  const filled = Math.round(clamped);

  return (
    <div
      className="flex min-h-[1.25rem] flex-wrap items-center gap-1.5"
      data-testid="trending-product-rating"
      aria-label={`${clamped.toFixed(1)} out of 5 stars${reviewCount != null && reviewCount > 0 ? `, ${reviewCount} reviews` : ''}`}
    >
      <span className="inline-flex items-center gap-px" role="img" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Icon
            key={i}
            name={i < filled ? 'star-filled' : 'star-empty'}
            size={15}
            className={
              i < filled
                ? 'shrink-0 text-amber-500'
                : 'shrink-0 text-default-400 opacity-55 dark:text-default-500'
            }
          />
        ))}
      </span>
      {reviewCount != null && reviewCount > 0 ? (
        <span className="text-xs font-medium tabular-nums" style={{ color: footerColors.creator }}>
          {reviewCount.toLocaleString('en-US')}
        </span>
      ) : null}
    </div>
  );
}
