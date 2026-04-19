/**
 * Tests:
 *   - packages/storefront/src/components/today/ProductHorizontalScroll.test.tsx
 */
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { MOCK_PRODUCTS } from '../../mock-data';
import { ProductHorizontalScroll } from './ProductHorizontalScroll';

function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductHorizontalScroll', () => {
  it('renders product cards in a snap scroll track', () => {
    renderWithProviders(
      <ProductHorizontalScroll title="Trending" products={MOCK_PRODUCTS.slice(0, 2)} />,
    );

    expect(screen.getByRole('region', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByTestId('product-horizontal-scroll-track')).toHaveClass('snap-x');
    expect(screen.getByText(MOCK_PRODUCTS[0]!.name)).toBeInTheDocument();
  });
});
