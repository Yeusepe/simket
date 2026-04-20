import type { ReactNode } from 'react';

interface ProductTileMetaBlockProps {
  readonly top: ReactNode;
  readonly byline: ReactNode;
  readonly bylineWrapperTestId?: string;
}

/**
 * Shared metadata stack used by all product tiles.
 * Keeps row spacing and DOM structure consistent across surfaces.
 */
export function ProductTileMetaBlock({
  top,
  byline,
  bylineWrapperTestId,
}: ProductTileMetaBlockProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="min-h-[0.75rem]">{top}</div>
      <div className="min-h-[0.875rem]" data-testid={bylineWrapperTestId}>
        {byline}
      </div>
    </div>
  );
}

interface ProductTilePriceRowProps {
  readonly left: ReactNode;
  readonly right?: ReactNode;
}

/**
 * Shared price/action row used by all product tiles.
 */
export function ProductTilePriceRow({ left, right }: ProductTilePriceRowProps) {
  return (
    <div className="flex w-full items-baseline justify-between gap-2 pt-1.5">
      <div className="min-w-0 flex-1">{left}</div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
