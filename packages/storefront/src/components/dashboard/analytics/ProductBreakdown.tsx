/**
 * Purpose: Sortable HeroUI table for creator product revenue, sales, views, and conversion performance.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/table
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/ProductBreakdown.test.tsx
 */
import { useMemo, useState } from 'react';
import { Card, Table } from '@heroui/react';
import type { ProductAnalytics } from './analytics-types';
import { formatCurrency, formatPercentage } from './use-analytics';

interface ProductBreakdownProps {
  readonly products: readonly ProductAnalytics[];
}

type SortColumn = 'name' | 'revenue' | 'sales' | 'views' | 'conversionRate';
type SortDirection = 'ascending' | 'descending';

interface SortState {
  readonly column: SortColumn;
  readonly direction: SortDirection;
}

function compareValues(
  left: ProductAnalytics,
  right: ProductAnalytics,
  column: SortColumn,
): number {
  switch (column) {
    case 'name':
      return left.name.localeCompare(right.name);
    case 'revenue':
      return left.revenue - right.revenue;
    case 'sales':
      return left.sales - right.sales;
    case 'views':
      return left.views - right.views;
    case 'conversionRate':
      return left.conversionRate - right.conversionRate;
  }
}

function getNextSortState(current: SortState, column: SortColumn): SortState {
  if (current.column === column) {
    return {
      column,
      direction: current.direction === 'ascending' ? 'descending' : 'ascending',
    };
  }

  return {
    column,
    direction: column === 'name' ? 'ascending' : 'descending',
  };
}

function getAriaSort(column: SortColumn, current: SortState): 'none' | 'ascending' | 'descending' {
  if (column !== current.column) {
    return 'none';
  }

  return current.direction;
}

export function ProductBreakdown({ products }: ProductBreakdownProps) {
  const [sortState, setSortState] = useState<SortState>({
    column: 'name',
    direction: 'ascending',
  });

  const sortedProducts = useMemo(() => {
    const nextProducts = [...products];
    nextProducts.sort((left, right) => {
      const comparison = compareValues(left, right, sortState.column);
      return sortState.direction === 'ascending' ? comparison : -comparison;
    });
    return nextProducts;
  }, [products, sortState]);

  return (
    <Card>
      <Card.Header className="space-y-1">
        <Card.Title>Product performance</Card.Title>
        <Card.Description>Review your strongest products across revenue, demand, and conversion.</Card.Description>
      </Card.Header>
      <Card.Content>
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Product performance breakdown">
              <Table.Header>
                <Table.Column isRowHeader aria-sort={getAriaSort('name', sortState)}>
                  <button type="button" className="font-semibold" onClick={() => setSortState((current) => getNextSortState(current, 'name'))}>
                    Sort by name
                  </button>
                </Table.Column>
                <Table.Column aria-sort={getAriaSort('revenue', sortState)}>
                  <button type="button" className="font-semibold" onClick={() => setSortState((current) => getNextSortState(current, 'revenue'))}>
                    Sort by revenue
                  </button>
                </Table.Column>
                <Table.Column aria-sort={getAriaSort('sales', sortState)}>
                  <button type="button" className="font-semibold" onClick={() => setSortState((current) => getNextSortState(current, 'sales'))}>
                    Sort by sales
                  </button>
                </Table.Column>
                <Table.Column aria-sort={getAriaSort('views', sortState)}>
                  <button type="button" className="font-semibold" onClick={() => setSortState((current) => getNextSortState(current, 'views'))}>
                    Sort by views
                  </button>
                </Table.Column>
                <Table.Column aria-sort={getAriaSort('conversionRate', sortState)}>
                  <button
                    type="button"
                    className="font-semibold"
                    onClick={() => setSortState((current) => getNextSortState(current, 'conversionRate'))}
                  >
                    Sort by conversion
                  </button>
                </Table.Column>
              </Table.Header>
              <Table.Body>
                {sortedProducts.map((product) => (
                  <Table.Row key={product.productId}>
                    <Table.Cell>{product.name}</Table.Cell>
                    <Table.Cell>{formatCurrency(product.revenue)}</Table.Cell>
                    <Table.Cell>{new Intl.NumberFormat('en-US').format(product.sales)}</Table.Cell>
                    <Table.Cell>{new Intl.NumberFormat('en-US').format(product.views)}</Table.Cell>
                    <Table.Cell>{formatPercentage(product.conversionRate)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card.Content>
    </Card>
  );
}
