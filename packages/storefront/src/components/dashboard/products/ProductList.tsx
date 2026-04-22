/**
 * Purpose: Creator-facing product table with search, visibility filters, sorting, and row actions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://heroui.com/docs/react/components/table
 *   - https://heroui.com/docs/react/components/search-field
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/ProductList.test.tsx
 */
import { useMemo, useState } from 'react';
import { Button, Card, Chip, SearchField, Table } from '@heroui/react';
import { Segment } from '@heroui-pro/react';
import type { ProductFormData, ProductSummary } from './product-types';
import { useDashboardPreferences } from '../dashboard-preferences';
import { formatPrice } from './use-products';

type SortKey = 'name' | 'price' | 'sales' | 'date';

interface ProductListProps {
  readonly products: readonly ProductSummary[];
  readonly isLoading?: boolean;
  readonly error?: string | null;
  readonly onCreateProduct?: () => void;
  readonly onEditProduct?: (productId: string) => void;
  readonly onCustomizePage?: (productId: string) => void;
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
  onCustomizePage,
  onDuplicateProduct,
  onArchiveProduct,
  onDeleteProduct,
}: ProductListProps) {
  const { preferences } = useDashboardPreferences();
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
    <Card className="rounded-[28px] border border-border/70 bg-surface/95">
      <Card.Header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <Card.Title>Products</Card.Title>
          <Card.Description>
            Manage pricing, publishing state, and custom Framely product pages for the creator catalog.
          </Card.Description>
        </div>
        <Button variant="primary" onPress={onCreateProduct}>
          New Product
        </Button>
      </Card.Header>

      <Card.Content className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <SearchField
            aria-label="Search creator products"
            value={search}
            onChange={setSearch}
            variant="secondary"
            fullWidth
          >
            <SearchField.Group className="rounded-2xl">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search by name or slug" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="grid gap-3 lg:grid-cols-2">
            <Segment
              aria-label="Filter creator products by visibility"
              selectedKey={visibilityFilter}
              onSelectionChange={(value) =>
                setVisibilityFilter(String(value) as 'all' | ProductSummary['visibility'])
              }
              size="sm"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <Segment.Item key={option} id={option}>
                  {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
                </Segment.Item>
              ))}
            </Segment>

            <Segment
              aria-label="Sort creator products"
              selectedKey={sortKey}
              onSelectionChange={(value) => setSortKey(String(value) as SortKey)}
              size="sm"
            >
              {(['name', 'price', 'sales', 'date'] as const).map((option) => (
                <Segment.Item key={option} id={option} aria-label={`Sort by ${option}`}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Segment.Item>
              ))}
            </Segment>
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
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Creator products">
                <Table.Header>
                  <Table.Column isRowHeader>Product</Table.Column>
                  <Table.Column>Price</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column>Sales</Table.Column>
                  <Table.Column>Revenue</Table.Column>
                  <Table.Column>Actions</Table.Column>
                </Table.Header>

                <Table.Body>
                  {filteredProducts.map((product) => (
                    <Table.Row key={product.id} id={product.id}>
                      <Table.Cell>
                        <div className={`flex items-center gap-3 ${preferences.density === 'compact' ? 'py-1' : 'py-2'}`}>
                          {product.heroImageUrl ? (
                            <img
                              src={product.heroImageUrl}
                              alt=""
                              className="h-14 w-20 rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="h-14 w-20 rounded-2xl bg-default-100" />
                          )}
                          <div className="min-w-0 space-y-1">
                            <p className="font-medium text-foreground">{product.name}</p>
                            <p className="text-xs text-muted-foreground">/{product.slug}</p>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>{formatPrice(product.price, product.currency)}</Table.Cell>
                      <Table.Cell>
                        <Chip color={getVisibilityColor(product.visibility)} variant="soft">
                          <Chip.Label className="capitalize">{product.visibility}</Chip.Label>
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>{product.salesCount}</Table.Cell>
                      <Table.Cell>{formatPrice(product.revenue, product.currency)}</Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Edit ${product.name}`}
                            onPress={() => onEditProduct?.(product.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Customize ${product.name} page`}
                            onPress={() => onCustomizePage?.(product.id)}
                          >
                            Customize Page
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Duplicate ${product.name}`}
                            onPress={() => onDuplicateProduct?.(product.id)}
                          >
                            Duplicate
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Archive ${product.name}`}
                            onPress={() => onArchiveProduct?.(product.id)}
                          >
                            Archive
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Delete ${product.name}`}
                            onPress={() => onDeleteProduct?.(product.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        ) : null}
      </Card.Content>
    </Card>
  );
}
