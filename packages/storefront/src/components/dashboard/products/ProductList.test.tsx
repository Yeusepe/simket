/**
 * Purpose: Regression tests for creator product list search, sorting, and empty states.
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
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductList } from './ProductList';
import type { ProductSummary } from './product-types';
import { DashboardPreferencesProvider } from '../dashboard-preferences';

const PRODUCTS: readonly ProductSummary[] = [
  {
    id: 'prod-1',
    name: 'Brush Pack',
    slug: 'brush-pack',
    price: 2500,
    currency: 'USD',
    visibility: 'published',
    salesCount: 12,
    revenue: 30000,
    heroImageUrl: 'https://cdn.example.com/brush-pack.webp',
    createdAt: '2025-02-01T10:00:00.000Z',
    updatedAt: '2025-02-02T10:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'Shader Pack',
    slug: 'shader-pack',
    price: 4500,
    currency: 'USD',
    visibility: 'draft',
    salesCount: 3,
    revenue: 13500,
    heroImageUrl: 'https://cdn.example.com/shader-pack.webp',
    createdAt: '2025-03-01T10:00:00.000Z',
    updatedAt: '2025-03-01T10:00:00.000Z',
  },
];

describe('ProductList', () => {
  it('renders creator products in a table', () => {
    render(
      <DashboardPreferencesProvider>
        <ProductList products={PRODUCTS} />
      </DashboardPreferencesProvider>,
    );

    expect(screen.getByRole('grid', { name: 'Creator products' })).toBeInTheDocument();
    expect(screen.getByText('Brush Pack')).toBeInTheDocument();
    expect(screen.getByText('Shader Pack')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
  });

  it('filters products by search query', async () => {
    const user = userEvent.setup();
    render(
      <DashboardPreferencesProvider>
        <ProductList products={PRODUCTS} />
      </DashboardPreferencesProvider>,
    );

    await user.type(screen.getByRole('searchbox', { name: 'Search creator products' }), 'shader');

    expect(screen.queryByText('Brush Pack')).not.toBeInTheDocument();
    expect(screen.getByText('Shader Pack')).toBeInTheDocument();
  });

  it('sorts products by price', async () => {
    const user = userEvent.setup();
    render(
      <DashboardPreferencesProvider>
        <ProductList products={PRODUCTS} />
      </DashboardPreferencesProvider>,
    );

    await user.click(screen.getByRole('radio', { name: 'Sort by price' }));

    const rows = screen.getAllByRole('row');
    expect(within(rows[1]!).getByRole('rowheader')).toHaveTextContent('Shader Pack');
  });

  it('shows an empty state when no products match', async () => {
    const user = userEvent.setup();
    render(
      <DashboardPreferencesProvider>
        <ProductList products={PRODUCTS} />
      </DashboardPreferencesProvider>,
    );

    await user.type(screen.getByRole('searchbox', { name: 'Search creator products' }), 'missing');

    expect(screen.getByText('No products yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first product or adjust the current filters.')).toBeInTheDocument();
  });

  it('invokes callbacks for row actions', async () => {
    const user = userEvent.setup();
    const onEditProduct = vi.fn();
    const onCustomizePage = vi.fn();
    const onDuplicateProduct = vi.fn();
    const onArchiveProduct = vi.fn();
    const onDeleteProduct = vi.fn();

    render(
      <DashboardPreferencesProvider>
        <ProductList
          products={PRODUCTS}
          onEditProduct={onEditProduct}
          onCustomizePage={onCustomizePage}
          onDuplicateProduct={onDuplicateProduct}
          onArchiveProduct={onArchiveProduct}
          onDeleteProduct={onDeleteProduct}
        />
      </DashboardPreferencesProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Edit Brush Pack' }));
    await user.click(screen.getByRole('button', { name: 'Customize Brush Pack page' }));
    await user.click(screen.getByRole('button', { name: 'Duplicate Brush Pack' }));
    await user.click(screen.getByRole('button', { name: 'Archive Brush Pack' }));
    await user.click(screen.getByRole('button', { name: 'Delete Brush Pack' }));

    expect(onEditProduct).toHaveBeenCalledWith('prod-1');
    expect(onCustomizePage).toHaveBeenCalledWith('prod-1');
    expect(onDuplicateProduct).toHaveBeenCalledWith('prod-1');
    expect(onArchiveProduct).toHaveBeenCalledWith('prod-1');
    expect(onDeleteProduct).toHaveBeenCalledWith('prod-1');
  });
});
