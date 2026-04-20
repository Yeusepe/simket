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
  readonly placeholderTestId?: string;
  readonly overlayTopRight?: ReactNode;
  readonly linkBodyExtra: ReactNode | ((props: ProductTileShellRenderProps) => ReactNode);
  readonly priceSection: ReactNode | ((props: ProductTileShellRenderProps) => ReactNode);
  readonly articleClassName?: string;
  readonly articleProps?: JSX.IntrinsicElements['article'];
  readonly priceStripeProps?: JSX.IntrinsicElements['section'];
}

export function ProductTileCard({
  productHref,
  title,
  imageUrl,
  imageAlt,
  placeholderTestId,
  overlayTopRight,
  linkBodyExtra,
  priceSection,
  articleClassName,
  articleProps,
  priceStripeProps,
}: ProductTileCardProps) {
  const shellCtx: ProductTileShellRenderProps = {};

  const articleClass = cn(
    'group relative flex h-full min-h-0 flex-1 flex-col overflow-visible text-foreground',
    articleClassName,
    articleProps?.className,
  );

  const { className: _a, style: articleStyleFromProps, ...articleDomRest } = articleProps ?? {};

  const frameClass = cn(
    'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem]',
    'border border-default-200/65 bg-gradient-to-b from-default-100/35 via-background to-background',
    'dark:border-default-600/50 dark:from-default-900/60 dark:via-background dark:to-background',
    'transition-[transform,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
    'group-hover:-translate-y-1 group-hover:border-default-300/80 dark:group-hover:border-default-500/65',
  );

  const articleNode = (
    <article
      className={articleClass}
      style={articleStyleFromProps as CSSProperties | undefined}
      {...articleDomRest}
    >
      <div className={frameClass}>
        <Link
          to={productHref}
          className={cn(
            'flex w-full shrink-0 flex-col outline-none',
            'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          <div className="relative isolate aspect-[4/5] w-full shrink-0 overflow-hidden rounded-[0.875rem] bg-muted/25">
            {overlayTopRight ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-3.5">
                <div className="pointer-events-auto">{overlayTopRight}</div>
              </div>
            ) : null}

            {imageUrl ? (
              <img
                src={imageUrl}
                alt={imageAlt}
                className={cn(
                  'absolute inset-0 size-full object-cover object-center',
                  'transition-[transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                  'group-hover:scale-[1.06] group-hover:saturate-[1.06]',
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

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-t from-background/90 via-background/30 to-transparent dark:from-background/95 dark:via-background/25"
              aria-hidden
            />
          </div>

          <div className="px-3.5 pb-3 pt-3.5">
            <h3
              className={cn(
                'line-clamp-2 text-left text-[0.9375rem] font-bold leading-[1.2] tracking-[-0.02em] text-balance text-foreground',
                'sm:text-[1rem]',
              )}
              title={title}
            >
              {title}
            </h3>
            <div className="mt-2 flex flex-col gap-2 text-[0.8125rem] leading-snug text-foreground/90">
              {renderShellSlot(linkBodyExtra, shellCtx)}
            </div>
          </div>
        </Link>

        <section
          {...priceStripeProps}
          className={cn(
            'border-t border-default-200/50 px-3.5 pb-2.5 pt-2 text-left dark:border-default-600/40',
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
