/**
 * Purpose: Framely block that renders the live Simket product detail surface
 *          inside a customizable creator product page.
 * Governing docs:
 *   - docs/architecture.md (§5 Framely integration, §12 source of truth)
 *   - docs/domain-model.md (§1 Product, §4.5 StorePage)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import type { BlockDefinition, FramelyRenderContext } from '../../../../framely-app/src/index';
import type { ProductDetail } from '../../types/product';
import { ProductDetailContent } from '../../components/ProductDetailContent';

interface ProductDetailBlockProps {
  readonly priceDisplay?: string;
  readonly descriptionText?: string;
  readonly ctaText?: string;
  readonly framelyContext?: FramelyRenderContext;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getProduct(context?: FramelyRenderContext): ProductDetail | null {
  return isRecord(context?.product) ? (context.product as unknown as ProductDetail) : null;
}

function getProductHref(context?: FramelyRenderContext): ((productSlug: string) => string) | undefined {
  const productHref = context?.hrefs?.product;
  return typeof productHref === 'function'
    ? (productHref as (productSlug: string) => string)
    : undefined;
}

export const productDetailBlockDefinition: BlockDefinition = {
  type: 'product-detail',
  label: 'Product Detail',
  icon: 'package',
  defaultProps: {
    ctaText: 'Add to cart',
  },
  propSchema: {
    fields: [
      {
        name: 'priceDisplay',
        type: 'text',
        label: 'Price override',
        required: false,
      },
      {
        name: 'descriptionText',
        type: 'text',
        label: 'Description override',
        required: false,
      },
      {
        name: 'ctaText',
        type: 'text',
        label: 'CTA label',
        required: false,
        defaultValue: 'Add to cart',
      },
    ],
  },
};

export function ProductDetailBlock({
  priceDisplay,
  descriptionText,
  ctaText,
  framelyContext,
}: ProductDetailBlockProps) {
  const product = getProduct(framelyContext);

  if (!product) {
    return null;
  }

  return (
    <ProductDetailContent
      product={product}
      buildProductHref={getProductHref(framelyContext)}
      priceDisplay={priceDisplay}
      descriptionText={descriptionText}
      ctaText={ctaText}
    />
  );
}
