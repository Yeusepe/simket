/**
 * Purpose: Regression tests for creator analytics product performance table and sorting.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/table
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/ProductBreakdown.test.tsx
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ProductBreakdown } from './ProductBreakdown';

const PRODUCTS = [
  {
    productId: 'prod-1',
    name: 'Brush Pack',
    revenue: 18000,
    sales: 4,
    views: 150,
    conversionRate: 2.7,
  },
  {
    productId: 'prod-2',
    name: 'Shader Pack',
    revenue: 42000,
    sales: 8,
    views: 220,
    conversionRate: 3.6,
  },
  {
    productId: 'prod-3',
    name: 'Texture Pack',
    revenue: 9000,
    sales: 2,
    views: 90,
    conversionRate: 1.8,
  },
] as const;

describe('ProductBreakdown', () => {
  it('renders product analytics rows', () => {
    render(<ProductBreakdown products={PRODUCTS} />);

    expect(screen.getByRole('grid', { name: 'Product performance breakdown' })).toBeInTheDocument();
    expect(screen.getByText('Brush Pack')).toBeInTheDocument();
    expect(screen.getByText('Shader Pack')).toBeInTheDocument();
    expect(screen.getByText('$420.00')).toBeInTheDocument();
  });

  it('sorts rows when a sortable heading is activated', async () => {
    const user = userEvent.setup();
    render(<ProductBreakdown products={PRODUCTS} />);

    await user.click(screen.getByRole('button', { name: 'Sort by revenue' }));

    const table = screen.getByRole('grid', { name: 'Product performance breakdown' });
    const rows = within(table).getAllByRole('row');

    expect(within(rows[1]!).getByText('Shader Pack')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Brush Pack')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Texture Pack')).toBeInTheDocument();
  });
});
