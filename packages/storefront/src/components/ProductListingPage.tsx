/**
 * Purpose: Product listing page — grid of ProductCards with filter sidebar,
 *          sort selector, and pagination.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 *   - docs/domain-model.md (Product entity)
 * External references:
 *   - HeroUI v3 Select: https://heroui.com/docs/react/components/select
 *     Anatomy: Select > Select.Trigger > Select.Value + Select.Indicator > Select.Popover > ListBox > ListBox.Item
 *     Variants: "primary" | "secondary"
 *   - HeroUI v3 CheckboxGroup: https://heroui.com/docs/react/components/checkbox-group
 *     Anatomy: CheckboxGroup > Checkbox(value) > Checkbox.Control > Checkbox.Indicator + Checkbox.Content > Label
 *   - HeroUI v3 Pagination: https://heroui.com/docs/react/components/pagination
 *     Anatomy: Pagination > Pagination.Summary + Pagination.Content > Pagination.Item >
 *              Pagination.Previous/Link(isActive)/Ellipsis/Next
 *   - HeroUI v3 Spinner: https://heroui.com/docs/react/components/spinner
 *     Simple: <Spinner size="lg" />
 * Tests:
 *   - packages/storefront/src/components/ProductListingPage.test.tsx
 */
import {
  Select,
  Label,
  ListBox,
  CheckboxGroup,
  Checkbox,
  Pagination,
} from '@heroui/react';
import type { Key } from 'react';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import {
  useProductListing,
  type ProductListingFetcher,
} from '../hooks/use-product-listing';
import type { FacetGroup, ProductFilters, ProductSortOption } from '../types/product';
import { DEFAULT_PER_PAGE } from '../types/product';

/** Maps sort key string ↔ ProductSortOption for the Select. */
const SORT_OPTIONS: ReadonlyArray<{ key: string; label: string; value: ProductSortOption }> = [
  { key: 'createdAt-DESC', label: 'Newest', value: { field: 'createdAt', direction: 'DESC' } },
  { key: 'createdAt-ASC', label: 'Oldest', value: { field: 'createdAt', direction: 'ASC' } },
  { key: 'price-ASC', label: 'Price: Low → High', value: { field: 'price', direction: 'ASC' } },
  { key: 'price-DESC', label: 'Price: High → Low', value: { field: 'price', direction: 'DESC' } },
  { key: 'name-ASC', label: 'Name: A → Z', value: { field: 'name', direction: 'ASC' } },
  { key: 'name-DESC', label: 'Name: Z → A', value: { field: 'name', direction: 'DESC' } },
];

function sortToKey(sort: ProductSortOption): string {
  return `${sort.field}-${sort.direction}`;
}

interface ProductListingPageProps {
  readonly fetcher: ProductListingFetcher;
}

export function ProductListingPage({ fetcher }: ProductListingPageProps) {
  const {
    products,
    facets,
    isLoading,
    error,
    page,
    totalPages,
    setPage,
    setSort,
    setFilters,
    sort,
    filters,
  } = useProductListing({ fetcher });

  const handleSortChange = (value: Key | null) => {
    if (typeof value !== 'string') return;
    const option = SORT_OPTIONS.find((o) => o.key === value);
    if (option) setSort(option.value);
  };

  const handleFacetChange = (facetName: string, values: string[]) => {
    if (facetName === 'Category') {
      setFilters({ ...filters, categorySlug: values[0] ?? undefined });
    } else if (facetName === 'Tags') {
      setFilters({ ...filters, tags: values.length > 0 ? values : undefined });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header with sort */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <SortSelect currentKey={sortToKey(sort)} onChange={handleSortChange} />
      </div>

      <div className="flex gap-6">
        {/* Filter sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <FilterSidebar
            facets={facets}
            filters={filters}
            onFacetChange={handleFacetChange}
          />
        </aside>

        {/* Main content area */}
        <main className="flex-1">
          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-danger bg-danger/10 p-4 text-danger">
              {error.message}
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: DEFAULT_PER_PAGE }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!isLoading && !error && products.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg text-muted-foreground">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or search terms.
              </p>
            </div>
          )}

          {!isLoading && products.items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination — only show when multiple pages */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <ListingPagination
                page={page}
                totalPages={totalPages}
                totalItems={products.totalItems}
                onPageChange={setPage}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SortSelect({
  currentKey,
  onChange,
}: {
  currentKey: string;
  onChange: (value: Key | null) => void;
}) {
  return (
    <Select
      value={currentKey}
      onChange={onChange}
      className="w-48"
    >
      <Label>Sort by</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {SORT_OPTIONS.map((opt) => (
            <ListBox.Item key={opt.key} id={opt.key} textValue={opt.label}>
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function FilterSidebar({
  facets,
  filters,
  onFacetChange,
}: {
  facets: readonly FacetGroup[];
  filters: ProductFilters;
  onFacetChange: (facetName: string, values: string[]) => void;
}) {
  if (facets.length === 0) return null;

  return (
    <div className="space-y-6">
      {facets.map((group) => {
        const selected = getSelectedForFacet(group.name, filters);

        return (
          <div key={group.name}>
            <CheckboxGroup
              value={selected}
              onChange={(vals: string[]) => onFacetChange(group.name, vals)}
            >
              <Label className="mb-2 block text-sm font-semibold">{group.name}</Label>
              {group.values.map((fv) => (
                <Checkbox key={fv.value} value={fv.value}>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label>
                      {fv.label} <span className="text-muted-foreground">({fv.count})</span>
                    </Label>
                  </Checkbox.Content>
                </Checkbox>
              ))}
            </CheckboxGroup>
          </div>
        );
      })}
    </div>
  );
}

function getSelectedForFacet(name: string, filters: ProductFilters): string[] {
  if (name === 'Category' && typeof filters.categorySlug === 'string') {
    return [filters.categorySlug];
  }
  if (name === 'Tags' && Array.isArray(filters.tags)) {
    return filters.tags as string[];
  }
  return [];
}

function ListingPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const pages = buildPageNumbers(page, totalPages);

  return (
    <Pagination aria-label="pagination">
      <Pagination.Summary>
        Showing page {page} of {totalPages} ({totalItems} products)
      </Pagination.Summary>
      <Pagination.Content>
        {/* Previous */}
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={page <= 1}
            onPress={() => onPageChange(page - 1)}
          >
            <Pagination.PreviousIcon />
            <span>Previous</span>
          </Pagination.Previous>
        </Pagination.Item>

        {/* Page links */}
        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <Pagination.Item key={`ellipsis-${idx}`}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={p}>
              <Pagination.Link
                isActive={p === page}
                onPress={() => onPageChange(p)}
              >
                {p}
              </Pagination.Link>
            </Pagination.Item>
          ),
        )}

        {/* Next */}
        <Pagination.Item>
          <Pagination.Next
            isDisabled={page >= totalPages}
            onPress={() => onPageChange(page + 1)}
          >
            <span>Next</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}

/** Builds an array of page numbers with 'ellipsis' gaps. */
function buildPageNumbers(
  current: number,
  total: number,
): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) pages.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push('ellipsis');

  pages.push(total);
  return pages;
}
