/**
 * Purpose: Responsive footer row for spotlight/bento heroes — product thumb, name,
 * creator link, and optional CTA. Reusable outside `BentoHeroFrame`.
 * Governing docs:
 *   - docs/architecture.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/button
 */
import { Button, Link } from '@heroui/react';

export interface SpotlightHeroFooterProps {
  readonly productName: string;
  readonly creatorName: string;
  readonly thumbnailSrc: string;
  /** Destination for the creator link (e.g. editorial URL). */
  readonly storyHref: string;
  readonly ctaLabel?: string;
  readonly showCta?: boolean;
  /** Defaults to navigating to `storyHref`. */
  readonly onCtaPress?: () => void;
  /**
   * Tighter thumb, type, and pill for small bento grid tiles.
   * When true, always uses the narrowest (phone-style) truncation and sizing at every breakpoint.
   */
  readonly compact?: boolean;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Product tile + metadata + optional pill CTA. Stacks on narrow viewports; aligns
 * horizontally from `sm` up. Long names use pretty wrapping and safe word breaks.
 */
export function SpotlightHeroFooter({
  productName,
  creatorName,
  thumbnailSrc,
  storyHref,
  ctaLabel = 'Read more',
  showCta = true,
  onCtaPress,
  compact = false,
  className,
  testId = 'spotlight-hero-footer',
}: SpotlightHeroFooterProps) {
  const handleCta = (): void => {
    if (onCtaPress) {
      onCtaPress();
    } else {
      window.location.assign(storyHref);
    }
  };

  return (
    <div
      data-testid={testId}
      className={`flex w-full min-w-0 flex-col pt-1 ${className ?? ''}`}
      data-spotlight-density={compact ? 'compact' : 'default'}
    >
      <div className={`flex min-w-0 items-center ${compact ? 'gap-1.5' : 'gap-3'}`}>
        <div
          className={`shrink-0 overflow-hidden rounded-md ${compact ? 'size-8' : 'size-11'}`}
        >
          <img
            src={thumbnailSrc}
            alt=""
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>

        <div
          className={`flex min-h-0 min-w-0 flex-1 items-center ${compact ? 'gap-2' : 'max-sm:gap-4 gap-2'}`}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5">
            <p
              className={`min-w-0 text-pretty font-medium leading-tight text-white [overflow-wrap:anywhere] ${compact ? 'truncate whitespace-nowrap text-[0.7rem]' : 'max-sm:truncate max-sm:whitespace-nowrap sm:whitespace-normal sm:line-clamp-2 sm:break-words text-sm'}`}
            >
              {productName}
            </p>
            <Link
              href={storyHref}
              className={`min-w-0 max-w-full text-pretty leading-snug text-white/95 underline decoration-white/60 underline-offset-2 [overflow-wrap:anywhere] ${compact ? 'line-clamp-1 text-[0.6rem]' : 'line-clamp-2 break-words text-xs'}`}
            >
              {creatorName}
            </Link>
          </div>
          {showCta ? (
            <Button
              size="sm"
              variant="primary"
              className={
                compact
                  ? 'h-6 min-h-6 shrink-0 rounded-full bg-white px-2 text-[0.6rem] leading-none text-default-foreground shadow-none'
                  : 'h-8 shrink-0 rounded-full bg-white px-4 text-default-foreground shadow-none max-sm:h-7 max-sm:min-h-7 max-sm:px-2.5 max-sm:text-[0.6875rem] max-sm:leading-none sm:min-h-8'
              }
              onPress={handleCta}
            >
              {ctaLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
