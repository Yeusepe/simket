/**
 * Purpose: Score + reviews (left, aligned with title) and star strip (right) — one row.
 */
import { Icon } from '../common/Icon';

const STAR_SIZE = 14;

export interface TrendingProductRatingProps {
  /** 0–5; values outside range are clamped. */
  readonly averageRating: number;
  readonly reviewCount?: number | null;
}

export function TrendingProductRating({ averageRating, reviewCount }: TrendingProductRatingProps) {
  const clamped = Math.max(0, Math.min(5, averageRating));
  const filled = Math.round(clamped);

  return (
    <div
      className="flex w-full min-w-0 items-center justify-between gap-2"
      data-testid="trending-product-rating"
      aria-label={`${clamped.toFixed(1)} out of 5 stars${reviewCount != null && reviewCount > 0 ? `, ${reviewCount} reviews` : ''}`}
    >
      <span className="inline-flex min-w-0 shrink items-baseline gap-1.5 text-xs tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground/90">{clamped.toFixed(1)}</span>
        {reviewCount != null && reviewCount > 0 ? (
          <>
            <span className="select-none text-muted-foreground/50" aria-hidden>
              ·
            </span>
            <span>{reviewCount.toLocaleString('en-US')}</span>
          </>
        ) : null}
      </span>
      <span
        className="inline-flex shrink-0 items-center gap-0.5"
        role="img"
        aria-hidden
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Icon
            key={i}
            name={i < filled ? 'star-filled' : 'star-empty'}
            size={STAR_SIZE}
            className={
              i < filled
                ? 'shrink-0 text-amber-400'
                : 'shrink-0 text-muted-foreground/35'
            }
          />
        ))}
      </span>
    </div>
  );
}
