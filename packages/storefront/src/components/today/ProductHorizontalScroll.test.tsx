/**
 * Tests:
 *   - packages/storefront/src/components/today/ProductHorizontalScroll.test.tsx
 */
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { MOCK_PRODUCTS } from '../../mock-data';
import { ProductHorizontalScroll } from './ProductHorizontalScroll';

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({
    session: null,
    isPending: false,
    isVendureReady: false,
    error: null,
    signInBuyer: vi.fn(),
    signUpBuyer: vi.fn(),
    signInCreator: vi.fn(),
    signOut: vi.fn(),
  }),
}));

function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductHorizontalScroll', () => {
  it('renders product cards in a HeroUI Pro carousel track', () => {
    renderWithProviders(
      <ProductHorizontalScroll title="Trending" products={MOCK_PRODUCTS.slice(0, 2)} />,
    );

    expect(screen.getByRole('region', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByTestId('product-horizontal-scroll-track')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous trending product' })).toHaveClass(
      'data-[disabled=true]:opacity-0',
      'data-[disabled=true]:pointer-events-none',
    );
    expect(screen.getByRole('button', { name: 'Next trending product' })).toHaveClass(
      'data-[disabled=true]:opacity-0',
      'data-[disabled=true]:pointer-events-none',
    );
    expect(screen.getByText(MOCK_PRODUCTS[0]!.name)).toBeInTheDocument();
  });
});
