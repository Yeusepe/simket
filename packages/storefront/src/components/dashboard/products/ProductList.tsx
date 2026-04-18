/**
 * Purpose: Creator-facing product table with search, visibility filters, sorting, and row actions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/table
 *   - https://www.heroui.com/docs/react/components/search-field
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/ProductList.test.tsx
 */
import { useMemo, useState } from 'react';
import { Button, Card, Chip, Input } from '@heroui/react';
import type { ProductFormData, ProductSummary } from './product-types';
import { formatPrice } from './use-products';

type SortKey = 'name' | 'price' | 'sales' | 'date';

interface ProductListProps {
  readonly products: readonly ProductSummary[];
  readonly isLoading?: boolean;
  readonly error?: string | null;
  readonly onCreateProduct?: () => void;
  readonly onEditProduct?: (productId: string) => void;
  readonly onDuplicateProduct?: (productId: string) => void;
  readonly onArchiveProduct?: (productId: string) => void;
  readonly onDeleteProduct?: (productId: string) => void;
}

const VISIBILITY_OPTIONS: ReadonlyArray<'all' | ProductFormData['visibility']> = [
  'all',
  'draft',
  'published',
  'archived',
];

function getVisibilityColor(visibility: ProductSummary['visibility']): 'default' | 'warning' | 'success' {
  switch (visibility) {
    case 'published':
      return 'success';
    case 'draft':
      return 'warning';
    default:
      return 'default';
  }
}

function sortProducts(products: readonly ProductSummary[], sortKey: SortKey): readonly ProductSummary[] {
  const nextProducts = [...products];

  nextProducts.sort((left, right) => {
    switch (sortKey) {
      case 'price':
        return right.price - left.price;
      case 'sales':
        return right.salesCount - left.salesCount;
      case 'date':
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      case 'name':
      default:
        return left.name.localeCompare(right.name);
    }
  });

  return nextProducts;
}

export function ProductList({
  products,
  isLoading = false,
  error = null,
  onCreateProduct,
  onEditProduct,
  onDuplicateProduct,
  onArchiveProduct,
  onDeleteProduct,
}: ProductListProps) {
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | ProductSummary['visibility']>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const visibleProducts = products.filter((product) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.slug.toLowerCase().includes(normalizedSearch);
      const matchesVisibility =
        visibilityFilter === 'all' || product.visibility === visibilityFilter;
      return matchesSearch && matchesVisibility;
    });

    return sortProducts(visibleProducts, sortKey);
  }, [products, search, sortKey, visibilityFilter]);

  return (
    <Card>
      <Card.Header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <Card.Title>Products</Card.Title>
          <Card.Description>Manage pricing, status, storefront art, and publishing actions for your creator catalog.</Card.Description>
        </div>
        <Button onPress={onCreateProduct}>New Product</Button>
      </Card.Header>

      <Card.Content className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <Input
            type="search"
            aria-label="Search creator products"
            placeholder="Search by product name"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            className="w-full xl:max-w-md"
          />

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              {VISIBILITY_OPTIONS.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={visibilityFilter === option ? 'secondary' : 'ghost'}
                  onPress={() => setVisibilityFilter(option)}
                >
                  {option === 'all' ? 'All' : option[0].toUpperCase() + option.slice(1)}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {(['name', 'price', 'sales', 'date'] as const).map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={sortKey === option ? 'secondary' : 'ghost'}
                  aria-label={`Sort by ${option}`}
                  onPress={() => setSortKey(option)}
                >
                  {option[0].toUpperCase() + option.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        {isLoading ? <p className="text-sm text-muted-foreground">Loading products…</p> : null}

        {!isLoading && filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-default-300 px-6 py-12 text-center">
            <p className="text-lg font-medium">No products yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first product or adjust the current filters.
            </p>
          </div>
        ) : null}

        {!isLoading && filteredProducts.length > 0 ? (
          <div role="table" aria-label="Creator products" className="space-y-2">
            <div
              role="row"
              className="hidden grid-cols-[6rem_minmax(0,1.6fr)_0.9fr_0.9fr_0.7fr_0.9fr_1.3fr] gap-3 rounded-2xl bg-default-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid"
            >
              <div role="columnheader">Image</div>
              <div role="columnheader">Name</div>
              <div role="columnheader">Price</div>
              <div role="columnheader">Status</div>
              <div role="columnheader">Sales</div>
              <div role="columnheader">Revenue</div>
              <div role="columnheader">Actions</div>
            </div>

            {filteredProducts.map((product) => (
              <div
                key={product.id}
                role="row"
                className="grid gap-4 rounded-2xl border border-default-200 px-4 py-4 lg:grid-cols-[6rem_minmax(0,1.6fr)_0.9fr_0.9fr_0.7fr_0.9fr_1.3fr]"
              >
                <div role="cell">
                  {product.heroImageUrl ? (
                    <img
                      src={product.heroImageUrl}
                      alt=""
                      className="h-12 w-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-12 w-20 rounded-xl bg-default-100" />
                  )}
                </div>
                <div role="cell">
                  <div className="space-y-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">/{product.slug}</p>
                  </div>
                </div>
                <div role="cell">{formatPrice(product.price, product.currency)}</div>
                <div role="cell">
                  <Chip color={getVisibilityColor(product.visibility)} variant="soft">
                    <Chip.Label className="capitalize">{product.visibility}</Chip.Label>
                  </Chip>
                </div>
                <div role="cell">{product.salesCount}</div>
                <div role="cell">{formatPrice(product.revenue, product.currency)}</div>
                <div role="cell">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" aria-label={`Edit ${product.name}`} onPress={() => onEditProduct?.(product.id)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Duplicate ${product.name}`} onPress={() => onDuplicateProduct?.(product.id)}>
                      Duplicate
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Archive ${product.name}`} onPress={() => onArchiveProduct?.(product.id)}>
                      Archive
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Delete ${product.name}`} onPress={() => onDeleteProduct?.(product.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}
