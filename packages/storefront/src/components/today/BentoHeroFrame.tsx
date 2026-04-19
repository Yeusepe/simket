/**
 * Purpose: Reusable square spotlight card — full-bleed image, shell-colored frame,
 * gradient from transparent (top) to shell color (bottom), footer with product thumb and CTA.
 * Governing docs:
 *   - docs/architecture.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 */
import { Button, Link } from '@heroui/react';

/** Default shell / frame color (Tailwind violet-200). Pass any valid CSS color. */
export const DEFAULT_BENTO_SHELL_COLOR = '#ddd6fe';

export interface BentoHeroFrameProps {
  /** Border and bottom gradient use this color (e.g. `#ddd6fe`, `oklch(...)`, `var(--my-token)`). */
  readonly shellColor?: string;
  readonly heroImage: string;
  readonly heroImageAlt: string;
  readonly eyebrow: string;
  readonly title: string;
  /** Footer primary line (product / listing name). */
  readonly productName: string;
  /** Footer underlined line (creator). */
  readonly creatorName: string;
  /** Square icon in the footer; defaults to `heroImage` when omitted. */
  readonly productThumbnailUrl?: string;
  readonly storyHref: string;
  readonly onReadMore?: () => void;
  readonly readMoreLabel?: string;
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
  productName,
  creatorName,
  productThumbnailUrl,
  storyHref,
  onReadMore,
  readMoreLabel = 'Read more',
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

  return (
    <article
      data-testid={testId}
      data-variant={dataVariant}
      data-shell-color={shellColor}
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border-[10px] shadow-xl ${className ?? ''}`}
      style={{
        borderColor: shellColor,
        backgroundColor: shellColor,
      }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <img src={heroImage} alt={heroImageAlt} className="absolute inset-0 h-full w-full object-cover" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${shellColor} 0%, color-mix(in oklab, ${shellColor} 35%, transparent) 45%, transparent 72%)`,
          }}
          aria-hidden
        />

        <div className="relative z-10 flex h-full min-h-0 flex-col justify-end gap-4 p-5 text-white sm:p-7">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/90 drop-shadow-sm">
              {eyebrow}
            </p>
            <h2 className="max-w-[95%] text-2xl font-bold leading-tight tracking-tight drop-shadow-md sm:text-3xl">
              {title}
            </h2>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white/50">
                <img
                  src={thumbSrc}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                <p className="line-clamp-2 text-sm font-medium leading-snug text-white drop-shadow-sm">
                  {productName}
                </p>
                <Link
                  href={storyHref}
                  className="inline-block w-fit max-w-full truncate text-xs text-white/95 underline decoration-white/60 underline-offset-2"
                >
                  {creatorName}
                </Link>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              className="shrink-0 self-center rounded-full bg-white px-4 text-default-foreground shadow-md"
              onPress={handleRead}
            >
              {readMoreLabel}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
