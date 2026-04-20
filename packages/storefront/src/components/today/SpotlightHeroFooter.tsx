/**
 * Purpose: Responsive footer row for spotlight/bento heroes — product thumb, name,
 * creator link, and optional CTA. Reusable outside `BentoHeroFrame`.
 * Governing docs:
 *   - docs/architecture.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/button
 *   - https://github.com/adobe/leonardo (via `createBentoSpotlightFooterColors`)
 */
import { Button, Link } from '@heroui/react';

import type { BentoSpotlightFooterColors } from '../../color/leonardo-theme';

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
  /** Leonardo-derived colors vs the spotlight reading surface. */
  readonly footerColors?: BentoSpotlightFooterColors;
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
  footerColors,
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
      data-spotlight-themed={footerColors ? 'leonardo' : 'default'}
    >
      <div className={`flex min-w-0 items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
        <div
          className={`shrink-0 overflow-hidden rounded-md ${compact ? 'size-8' : 'size-9'}`}
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
          className={`flex min-h-min min-w-0 flex-1 items-center ${compact ? 'gap-2' : 'max-sm:gap-3 gap-2'}`}
        >
          <div className="flex min-h-min min-w-0 flex-1 flex-col gap-0.5 overflow-visible">
            <p
              className={`min-w-0 text-pretty font-medium leading-tight [overflow-wrap:anywhere] ${footerColors ? '' : 'text-white'} ${compact ? 'truncate whitespace-nowrap text-[0.7rem]' : 'max-sm:truncate max-sm:whitespace-nowrap sm:whitespace-normal sm:line-clamp-2 sm:break-words text-xs'}`}
              style={footerColors ? { color: footerColors.product } : undefined}
            >
              {productName}
            </p>
            <Link
              href={storyHref}
              className={`min-w-0 max-w-full overflow-visible text-pretty leading-normal underline underline-offset-2 [overflow-wrap:anywhere] ${footerColors ? 'decoration-[color-mix(in_srgb,currentColor_55%,transparent)]' : 'text-white/95 decoration-white/60'} ${compact ? 'line-clamp-1 text-[0.6rem]' : 'break-words text-[0.65rem] sm:text-[0.7rem]'}`}
              style={footerColors ? { color: footerColors.creator } : undefined}
            >
              {creatorName}
            </Link>
          </div>
          {showCta ? (
            <Button
              size="sm"
              variant="primary"
              className={
                footerColors
                  ? compact
                    ? 'h-6 min-h-6 shrink-0 rounded-full border px-2 text-[0.6rem] leading-none shadow-none'
                    : 'h-7 min-h-7 shrink-0 rounded-full border px-3 text-[0.7rem] leading-none shadow-none max-sm:h-6 max-sm:min-h-6 max-sm:px-2 max-sm:text-[0.65rem] sm:text-xs'
                  : compact
                    ? 'h-6 min-h-6 shrink-0 rounded-full bg-white px-2 text-[0.6rem] leading-none text-default-foreground shadow-none'
                    : 'h-7 min-h-7 shrink-0 rounded-full bg-white px-3 text-[0.7rem] leading-none text-default-foreground shadow-none max-sm:h-6 max-sm:min-h-6 max-sm:px-2 max-sm:text-[0.65rem] sm:text-xs'
              }
              style={
                footerColors
                  ? {
                      backgroundColor: footerColors.ctaBackground,
                      borderColor: `color-mix(in srgb, ${footerColors.ctaForeground} 36%, transparent)`,
                      color: footerColors.ctaForeground,
                    }
                  : undefined
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
