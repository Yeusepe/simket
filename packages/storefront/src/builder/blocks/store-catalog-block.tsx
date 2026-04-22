/**
 * Purpose: Framely block that renders a creator store's live product catalog.
 * Governing docs:
 *   - docs/architecture.md (§5 Framely integration, §12 source of truth)
 *   - docs/domain-model.md (§1 Product, §4.5 StorePage)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import type { BlockDefinition, FramelyRenderContext } from '../../../../framely-app/src/index';
import type { CreatorStore } from '../../store/types';
import { ProductCard } from '../../components/ProductCard';

interface StoreCatalogBlockProps {
  readonly heading?: string;
  readonly description?: string;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly columns?: number;
  readonly framelyContext?: FramelyRenderContext;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStore(context?: FramelyRenderContext): CreatorStore | null {
  return isRecord(context?.store) ? (context.store as unknown as CreatorStore) : null;
}

function getProductHref(context?: FramelyRenderContext): ((productSlug: string) => string) | undefined {
  const productHref = context?.hrefs?.product;
  return typeof productHref === 'function'
    ? (productHref as (productSlug: string) => string)
    : undefined;
}

function getColumnsClass(columns?: number): string {
  switch (columns) {
    case 1:
      return 'grid-cols-1';
    case 2:
      return 'grid-cols-1 md:grid-cols-2';
    case 4:
      return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
    case 3:
    default:
      return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  }
}

export const storeCatalogBlockDefinition: BlockDefinition = {
  type: 'store-catalog',
  label: 'Store Catalog',
  icon: 'grid',
  defaultProps: {
    heading: 'Catalog',
    description: 'Browse the latest products in this creator store.',
    emptyTitle: 'No products yet',
    emptyDescription: 'Publish a product to populate the store catalog.',
    columns: 3,
  },
  propSchema: {
    fields: [
      {
        name: 'heading',
        type: 'text',
        label: 'Heading',
        required: false,
        defaultValue: 'Catalog',
      },
      {
        name: 'description',
        type: 'text',
        label: 'Description',
        required: false,
        defaultValue: 'Browse the latest products in this creator store.',
      },
      {
        name: 'emptyTitle',
        type: 'text',
        label: 'Empty title',
        required: false,
        defaultValue: 'No products yet',
      },
      {
        name: 'emptyDescription',
        type: 'text',
        label: 'Empty description',
        required: false,
        defaultValue: 'Publish a product to populate the store catalog.',
      },
      {
        name: 'columns',
        type: 'number',
        label: 'Columns',
        required: false,
        defaultValue: 3,
      },
    ],
  },
};

export function StoreCatalogBlock({
  heading = 'Catalog',
  description = 'Browse the latest products in this creator store.',
  emptyTitle = 'No products yet',
  emptyDescription = 'Publish a product to populate the store catalog.',
  columns = 3,
  framelyContext,
}: StoreCatalogBlockProps) {
  const store = getStore(framelyContext);
  const buildProductHref = getProductHref(framelyContext);

  if (!store) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">{heading}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {store.products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-default-300 px-6 py-12 text-center">
          <p className="text-lg font-medium">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${getColumnsClass(columns)}`}>
          {store.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              href={buildProductHref ? buildProductHref(product.slug) : undefined}
              showWishlistButton={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
