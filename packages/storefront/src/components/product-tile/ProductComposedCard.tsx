import type { ReactNode } from 'react';

import {
  ProductTileCard,
  type ProductTileArticleProps,
  type ProductTileSectionProps,
} from './ProductTileCard';
import { ProductTileMetaBlock, ProductTilePriceRow } from './ProductTileSections';
import { SparseCreatorByline } from './SparseCreatorByline';
import type { ProductCreatorRef } from '../../types/product';

export interface ProductComposedCardProps {
  readonly productHref: string;
  readonly title: string;
  readonly imageUrl: string | null | undefined;
  readonly imageAlt: string;
  readonly shellColor?: string | null;
  readonly placeholderTestId?: string;
  readonly overlayTopRight?: ReactNode;
  readonly metaTop: ReactNode;
  readonly bylineWrapperTestId?: string;
  readonly creatorName: string;
  readonly creatorAvatarUrl?: string | null;
  readonly collaborators?: readonly ProductCreatorRef[] | undefined;
  readonly footerLeft: ReactNode;
  readonly footerRight?: ReactNode;
  readonly articleClassName?: string;
  readonly articleProps?: ProductTileArticleProps;
  readonly priceStripeProps?: ProductTileSectionProps;
}

/**
 * Single composed product card used across surfaces.
 * Keeps DOM structure identical while allowing content slots.
 */
export function ProductComposedCard({
  productHref,
  title,
  imageUrl,
  imageAlt,
  shellColor,
  placeholderTestId,
  overlayTopRight,
  metaTop,
  bylineWrapperTestId,
  creatorName,
  creatorAvatarUrl,
  collaborators,
  footerLeft,
  footerRight,
  articleClassName,
  articleProps,
  priceStripeProps,
}: ProductComposedCardProps) {
  return (
    <ProductTileCard
      productHref={productHref}
      title={title}
      imageUrl={imageUrl}
      imageAlt={imageAlt}
      shellColor={shellColor}
      placeholderTestId={placeholderTestId}
      overlayTopRight={overlayTopRight}
      articleClassName={articleClassName}
      articleProps={articleProps}
      priceStripeProps={priceStripeProps}
      linkBodyExtra={() => (
        <ProductTileMetaBlock
          top={metaTop}
          byline={
            <SparseCreatorByline
              creatorName={creatorName}
              creatorAvatarUrl={creatorAvatarUrl}
              collaborators={collaborators}
            />
          }
          bylineWrapperTestId={bylineWrapperTestId}
        />
      )}
      priceSection={() => <ProductTilePriceRow left={footerLeft} right={footerRight} />}
    />
  );
}
