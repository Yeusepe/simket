/**
 * Purpose: Product tile — portrait hero and integrated content block (no floating overlay card).
 * Used by Today trending and Discovery.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { JSX } from 'react';

import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

/** Slot context (reserved; callers may ignore). */
export type ProductTileShellRenderProps = Record<string, never>;

export type ProductTileArticleProps = JSX.IntrinsicElements['article'] & {
  readonly [key: `data-${string}`]: string | number | boolean | undefined;
};

export type ProductTileSectionProps = JSX.IntrinsicElements['section'] & {
  readonly [key: `data-${string}`]: string | number | boolean | undefined;
};

function renderShellSlot(
  slot: ReactNode | ((props: ProductTileShellRenderProps) => ReactNode),
  ctx: ProductTileShellRenderProps,
): ReactNode {
  return typeof slot === 'function' ? slot(ctx) : slot;
}

export interface ProductTileCardProps {
  readonly productHref: string;
  readonly title: string;
  readonly imageUrl: string | null | undefined;
  readonly imageAlt: string;
  readonly shellColor?: string | null;
  readonly placeholderTestId?: string;
  readonly overlayTopRight?: ReactNode;
  readonly linkBodyExtra: ReactNode | ((props: ProductTileShellRenderProps) => ReactNode);
  readonly priceSection: ReactNode | ((props: ProductTileShellRenderProps) => ReactNode);
  readonly articleClassName?: string;
  readonly articleProps?: ProductTileArticleProps;
  readonly priceStripeProps?: ProductTileSectionProps;
}

export function ProductTileCard({
  productHref,
  title,
  imageUrl,
  imageAlt,
  shellColor,
  placeholderTestId,
  overlayTopRight,
  linkBodyExtra,
  priceSection,
  articleClassName,
  articleProps,
  priceStripeProps,
}: ProductTileCardProps) {
  const shellCtx: ProductTileShellRenderProps = {};
  const accentColor =
    typeof shellColor === 'string' && shellColor.trim().length > 0
      ? shellColor.trim()
      : undefined;
  const leonardoSurface =
    'color-mix(in srgb, var(--store-bg, var(--simket-bg, var(--background))) 78%, var(--store-subtle, var(--simket-subtle, var(--surface))) 22%)';

  const articleClass = cn(
    'group relative flex h-full min-h-0 flex-1 flex-col overflow-visible text-foreground',
    articleClassName,
    articleProps?.className,
  );

  const { className: _a, style: articleStyleFromProps, ...articleDomRest } = articleProps ?? {};

  const frameClass = cn(
    'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.35rem]',
    'transition-transform duration-300 ease-out',
    'group-hover:-translate-y-1',
  );
  const frameStyle: CSSProperties = {
    backgroundColor: leonardoSurface,
  };

  const articleNode = (
    <article
      className={articleClass}
      data-shell-color={accentColor}
      data-surface-theme="leonardo"
      style={articleStyleFromProps as CSSProperties | undefined}
      {...articleDomRest}
    >
      <div className={frameClass} style={frameStyle}>
        <Link
          to={productHref}
          className={cn(
            'flex w-full shrink-0 flex-col outline-none',
            'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          <div
            className="relative isolate aspect-square w-full shrink-0 overflow-hidden rounded-t-[1.35rem] rounded-b-none bg-muted/20"
            data-testid="product-tile-media"
          >
            {overlayTopRight ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-2.5">
                <div className="pointer-events-auto">{overlayTopRight}</div>
              </div>
            ) : null}

            {imageUrl ? (
              <img
                src={imageUrl}
                alt={imageAlt}
                className={cn(
                  'absolute inset-0 size-full object-cover object-center',
                  'transition-transform duration-500 ease-out',
                  'group-hover:scale-[1.025]',
                )}
                loading="lazy"
              />
            ) : (
              <div
                data-testid={placeholderTestId}
                className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/90 via-muted/50 to-muted/70"
              >
                <span className="max-w-[12rem] text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  No preview
                </span>
              </div>
            )}
          </div>

          <div className="px-4 pb-3 pt-2.5">
            <h3
              className={cn(
                'line-clamp-2 text-left text-[1rem] font-semibold leading-[1.2] tracking-[-0.025em] text-balance text-foreground',
                'sm:text-[1.06rem]',
              )}
              title={title}
            >
              {title}
            </h3>
            <div className="mt-1 flex flex-col gap-1.5 text-[0.8rem] leading-snug text-foreground/85">
              {renderShellSlot(linkBodyExtra, shellCtx)}
            </div>
          </div>
        </Link>

        <section
          {...priceStripeProps}
          className={cn(
            'px-4 pb-4 pt-0 text-left',
            priceStripeProps?.className,
          )}
          style={priceStripeProps?.style as CSSProperties | undefined}
        >
          {renderShellSlot(priceSection, shellCtx)}
        </section>
      </div>
    </article>
  );

  return articleNode;
}
