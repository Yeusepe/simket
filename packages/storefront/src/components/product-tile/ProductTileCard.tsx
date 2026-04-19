/**
 * Purpose: Single Leonardo-themed product tile — square hero, shell surface, title column,
 * price row. Used by Today trending and Discovery so layout and theming stay in sync.
 * Governing docs:
 *   - docs/architecture.md
 */
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import type { BentoSpotlightFooterColors } from '../../color/leonardo-theme';
import { createBentoSpotlightFooterColors, shellHarmonyDividerColor } from '../../color/leonardo-theme';
import { DEFAULT_BENTO_SHELL_COLOR } from '../today/BentoHeroFrame';

export { DEFAULT_BENTO_SHELL_COLOR };

/** Passed to {@link ProductTileCard} render slots so children can use the same Leonardo theme. */
export interface ProductTileShellRenderProps {
  readonly footerColors: BentoSpotlightFooterColors;
  readonly shellColor: string;
  readonly priceDividerColor: string;
}

function renderShellSlot(
  slot: ReactNode | ((props: ProductTileShellRenderProps) => ReactNode),
  ctx: ProductTileShellRenderProps,
): ReactNode {
  return typeof slot === 'function' ? slot(ctx) : slot;
}

export interface ProductTileCardProps {
  /** Listing / CMS tint; defaults to violet-200. */
  readonly shellColor?: string | null;
  readonly productHref: string;
  readonly title: string;
  readonly imageUrl: string | null | undefined;
  readonly imageAlt: string;
  /** Usually same as `previewColor` — drives no-image placeholder gradient. */
  readonly shellAccent?: string | null;
  readonly placeholderTestId?: string;
  /** e.g. wishlist — absolutely positioned top-right of the tile. */
  readonly overlayTopRight?: ReactNode;
  /** Content below the title inside the product link (tags, byline, chips, …). */
  readonly linkBodyExtra: ReactNode | ((props: ProductTileShellRenderProps) => ReactNode);
  /** Full contents of the bottom bordered stripe (price, actions). */
  readonly priceSection: ReactNode | ((props: ProductTileShellRenderProps) => ReactNode);
  readonly articleClassName?: string;
  readonly articleProps?: ComponentPropsWithoutRef<'article'>;
  /** Extra props on the bottom bordered stripe (e.g. `data-testid`, `aria-label`). */
  readonly priceStripeProps?: ComponentPropsWithoutRef<'section'>;
}

export function ProductTileCard({
  shellColor: shellColorProp,
  productHref,
  title,
  imageUrl,
  imageAlt,
  shellAccent,
  placeholderTestId,
  overlayTopRight,
  linkBodyExtra,
  priceSection,
  articleClassName,
  articleProps,
  priceStripeProps,
}: ProductTileCardProps) {
  const shellColor = shellColorProp ?? DEFAULT_BENTO_SHELL_COLOR;
  const footerColors = useMemo(
    () => createBentoSpotlightFooterColors(shellColor, { contrastSurface: 'solidShell' }),
    [shellColor],
  );
  const priceDividerColor = useMemo(
    () => shellHarmonyDividerColor(footerColors.surface),
    [footerColors.surface],
  );

  const shellCtx: ProductTileShellRenderProps = {
    footerColors,
    shellColor,
    priceDividerColor,
  };

  const articleClass = [
    'flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-content1 transition-transform duration-200 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-primary',
    articleClassName,
    articleProps?.className,
  ]
    .filter(Boolean)
    .join(' ');

  const { className: _a, ...articleRest } = articleProps ?? {};

  const inner = (
    <article className={articleClass} {...articleRest}>
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-bento-text-themed="leonardo"
        style={{
          backgroundColor: footerColors.surface,
          color: footerColors.product,
        }}
      >
        <Link
          to={productHref}
          className="flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-content1">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={imageAlt}
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="lazy"
              />
            ) : (
              <div
                data-testid={placeholderTestId}
                className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/35 via-secondary/25 to-primary/50"
                style={
                  shellAccent
                    ? {
                        background: `linear-gradient(145deg, color-mix(in srgb, ${shellAccent} 55%, white), color-mix(in srgb, ${shellAccent} 18%, white))`,
                      }
                    : undefined
                }
              >
                <span className="text-xs font-medium text-foreground/80">No image</span>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 pt-4">
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <h3
                className="line-clamp-2 shrink-0 text-left text-sm font-bold leading-snug tracking-tight text-balance sm:text-base"
                style={{ color: footerColors.product }}
                title={title}
              >
                {title}
              </h3>
              {renderShellSlot(linkBodyExtra, shellCtx)}
            </div>
          </div>
        </Link>

        <section
          {...priceStripeProps}
          className={[
            'w-full shrink-0 border-t border-solid px-4 pb-4 pt-4 text-left',
            priceStripeProps?.className,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            ...(priceStripeProps?.style as CSSProperties | undefined),
            borderTopColor: priceDividerColor,
          }}
        >
          {renderShellSlot(priceSection, shellCtx)}
        </section>
      </div>
    </article>
  );

  if (overlayTopRight) {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-col">
        {overlayTopRight}
        {inner}
      </div>
    );
  }

  return inner;
}
