/**
 * Purpose: Reusable square spotlight card — full-bleed image, shell-colored frame,
 * gradient from transparent (top) to shell color (bottom), eyebrow / title / optional subline,
 * footer with product thumb and CTA. Use `density="compact"` for small bento grid cells.
 * Governing docs:
 *   - docs/architecture.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 */
import { SpotlightHeroFooter } from './SpotlightHeroFooter';

/** Default shell / frame color (Tailwind violet-200). Pass any valid CSS color. */
export const DEFAULT_BENTO_SHELL_COLOR = '#ddd6fe';

/** Fluid type scale from headline length (title stays readable in the bento tile). */
export function spotlightHeadlineClass(
  title: string,
  density: 'default' | 'compact' = 'default',
): string {
  const n = title.trim().length;
  if (density === 'compact') {
    if (n <= 22) {
      return 'text-base leading-[1.08] line-clamp-2';
    }
    if (n <= 42) {
      return 'text-sm leading-[1.08] line-clamp-3';
    }
    if (n <= 68) {
      return 'text-sm leading-[1.08] line-clamp-3';
    }
    return 'text-xs leading-[1.08] line-clamp-4';
  }
  if (n <= 22) {
    return 'text-3xl sm:text-[2rem] leading-[1.05] max-sm:line-clamp-2 sm:line-clamp-none';
  }
  if (n <= 42) {
    return 'text-2xl sm:text-3xl leading-[1.08] max-sm:line-clamp-3 sm:line-clamp-none';
  }
  if (n <= 68) {
    return 'text-xl sm:text-2xl leading-[1.08] max-sm:line-clamp-3 sm:line-clamp-none';
  }
  return 'text-lg sm:text-xl leading-[1.08] max-sm:line-clamp-3 sm:line-clamp-4';
}

export interface BentoHeroFrameProps {
  /** Border and bottom gradient use this color (e.g. `#ddd6fe`, `oklch(...)`, `var(--my-token)`). */
  readonly shellColor?: string;
  readonly heroImage: string;
  readonly heroImageAlt: string;
  readonly eyebrow: string;
  readonly title: string;
  /** Optional small line below the title (CMS: `spotlightSubline`). */
  readonly spotlightSubline?: string;
  /** `compact` = tighter type/padding for small bento grid cells (editor picks). */
  readonly density?: 'default' | 'compact';
  /** Footer primary line (product / listing name). */
  readonly productName: string;
  /** Footer underlined line (creator). */
  readonly creatorName: string;
  /** Square icon in the footer; defaults to `heroImage` when omitted. */
  readonly productThumbnailUrl?: string;
  readonly storyHref: string;
  readonly onReadMore?: () => void;
  /** Label for the CTA pill (e.g. formatted price or “Read more”). */
  readonly spotlightCtaLabel?: string;
  /** When false, the CTA pill is not rendered. */
  readonly showSpotlightCta?: boolean;
  readonly className?: string;
  /** Defaults to `bento-hero-frame`. */
  readonly testId?: string;
  /** Optional `data-variant` on the root (e.g. `bento`). */
  readonly dataVariant?: string;
}

export function BentoHeroFrame({
  shellColor = DEFAULT_BENTO_SHELL_COLOR,
  heroImage,
  heroImageAlt,
  eyebrow,
  title,
  spotlightSubline,
  density = 'default',
  productName,
  creatorName,
  productThumbnailUrl,
  storyHref,
  onReadMore,
  spotlightCtaLabel = 'Read more',
  showSpotlightCta = true,
  className,
  testId = 'bento-hero-frame',
  dataVariant,
}: BentoHeroFrameProps) {
  const handleRead = (): void => {
    if (onReadMore) {
      onReadMore();
    } else {
      window.location.assign(storyHref);
    }
  };

  const thumbSrc = productThumbnailUrl ?? heroImage;
  const headlineClass = spotlightHeadlineClass(title, density);
  const subline = spotlightSubline?.trim();
  const isCompact = density === 'compact';

  return (
    <article
      data-testid={testId}
      data-variant={dataVariant}
      data-shell-color={shellColor}
      data-bento-density={density}
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border-[10px] ${className ?? ''}`}
      style={{
        borderColor: shellColor,
        backgroundColor: shellColor,
      }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <img src={heroImage} alt={heroImageAlt} className="absolute inset-0 h-full w-full object-cover" />
        {/* Compact picks: always use the strong lower-third fade (same as narrow-stack featured). */}
        {isCompact ? (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${shellColor} 0%, ${shellColor} 18%, color-mix(in oklab, ${shellColor} 62%, transparent) 33%, color-mix(in oklab, ${shellColor} 22%, transparent) 54%, transparent 84%)`,
            }}
            aria-hidden
          />
        ) : (
          <>
            <div
              className="pointer-events-none absolute inset-0 lg:hidden"
              style={{
                background: `linear-gradient(to top, ${shellColor} 0%, ${shellColor} 18%, color-mix(in oklab, ${shellColor} 62%, transparent) 33%, color-mix(in oklab, ${shellColor} 22%, transparent) 54%, transparent 84%)`,
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 hidden lg:block"
              style={{
                background: `linear-gradient(to top, ${shellColor} 0%, color-mix(in oklab, ${shellColor} 35%, transparent) 45%, transparent 72%)`,
              }}
              aria-hidden
            />
          </>
        )}

        <div
          className={
            isCompact
              ? 'relative z-10 flex h-full min-h-0 flex-col justify-end gap-1.5 p-2.5 text-white sm:gap-2 sm:p-3'
              : 'relative z-10 flex h-full min-h-0 flex-col justify-end gap-4 p-5 text-white sm:p-7'
          }
        >
          <div className={isCompact ? 'space-y-0.5' : 'space-y-1'}>
            <p
              className={
                isCompact
                  ? 'text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/90'
                  : 'text-xs font-semibold uppercase tracking-[0.25em] text-white/90'
              }
            >
              {eyebrow}
            </p>
            <h2 className={`w-full min-w-0 text-balance font-bold tracking-tight ${headlineClass}`}>
              {title}
            </h2>
            {subline ? (
              <p
                className={
                  isCompact
                    ? 'w-full min-w-0 text-pretty text-[0.65rem] font-medium leading-snug text-white/85 line-clamp-2 [overflow-wrap:anywhere]'
                    : 'w-full min-w-0 text-pretty text-xs font-medium leading-snug text-white/85 sm:text-sm max-sm:line-clamp-2 [overflow-wrap:anywhere]'
                }
              >
                {subline}
              </p>
            ) : null}
          </div>

          <SpotlightHeroFooter
            productName={productName}
            creatorName={creatorName}
            thumbnailSrc={thumbSrc}
            storyHref={storyHref}
            ctaLabel={spotlightCtaLabel}
            showCta={showSpotlightCta}
            onCtaPress={handleRead}
            compact={isCompact}
          />
        </div>
      </div>
    </article>
  );
}
