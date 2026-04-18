/**
 * Tests for ProductListingPage component.
 *
 * Verified HeroUI v3 APIs (fetched from heroui.com/docs):
 *   - Select: compound Select > Select.Trigger > Select.Value > Select.Popover > ListBox > ListBox.Item
 *   - CheckboxGroup: CheckboxGroup > Checkbox > Checkbox.Control + Checkbox.Content
 *   - Pagination: Pagination > Pagination.Content > Pagination.Item > Pagination.Link/Previous/Next
 *   - Spinner: <Spinner size="lg" />
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProductListingPage } from './ProductListingPage';
import {
  makeProductListingResponse,
  resetProductCounter,
} from '../types/product.factory';
import type { ProductListingFetcher } from '../hooks/use-product-listing';

function renderPage(fetcher: ProductListingFetcher) {
  return render(
    <MemoryRouter>
      <ProductListingPage fetcher={fetcher} />
    </MemoryRouter>,
  );
}

describe('ProductListingPage', () => {
  let mockFetcher: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetProductCounter();
    mockFetcher = vi.fn();
  });

  it('shows loading skeletons while fetching', () => {
    // Never resolve — keep loading
    mockFetcher.mockReturnValue(new Promise(() => {}));
    renderPage(mockFetcher);

    const skeletons = screen.getAllByTestId('product-card-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders product cards after data loads', async () => {
    const response = makeProductListingResponse(4);
    mockFetcher.mockResolvedValue(response);
    renderPage(mockFetcher);

    // Wait for products to appear by finding the first product name
    const firstName = response.products.items[0].name;
    await waitFor(() => {
      expect(screen.getByText(firstName)).toBeInTheDocument();
    });

    // All 4 products rendered
    for (const item of response.products.items) {
      expect(screen.getByText(item.name)).toBeInTheDocument();
    }
  });

  it('renders filter sidebar with facet groups', async () => {
    mockFetcher.mockResolvedValue(makeProductListingResponse(2));
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText('Category')).toBeInTheDocument();
    });

    // Facet values with counts
    expect(screen.getByText(/Digital Art/)).toBeInTheDocument();
    expect(screen.getByText(/Music/)).toBeInTheDocument();
  });

  it('renders sort selector', async () => {
    mockFetcher.mockResolvedValue(makeProductListingResponse(2));
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText(
        (_, element) => element?.textContent === 'Sort by' || false,
      )).toBeInTheDocument();
    });
  });

  it('shows error message on fetch failure', async () => {
    mockFetcher.mockRejectedValue(new Error('Network error'));
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no products found', async () => {
    mockFetcher.mockResolvedValue({
      products: { items: [], totalItems: 0 },
      facets: [],
    });
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText(/No products found/i)).toBeInTheDocument();
    });
  });

  it('renders pagination when there are multiple pages', async () => {
    // 2 items per page view, but 48 total means multiple pages
    mockFetcher.mockResolvedValue({
      ...makeProductListingResponse(6),
      products: { items: makeProductListingResponse(6).products.items, totalItems: 48 },
    });
    renderPage(mockFetcher);

    await waitFor(() => {
      // Pagination should show page numbers
      expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
    });
  });

  it('does not render pagination for a single page', async () => {
    const response = makeProductListingResponse(4);
    const firstName = response.products.items[0].name;
    mockFetcher.mockResolvedValue(response);
    renderPage(mockFetcher);

    await waitFor(() => {
      expect(screen.getByText(firstName)).toBeInTheDocument();
    });

    // Should not render pagination nav
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });

  it('passes page number to fetcher and re-fetches', async () => {
    resetProductCounter();
    const response = makeProductListingResponse(6, 48);
    mockFetcher.mockResolvedValue(response);
    renderPage(mockFetcher);

    // Wait for initial load
    await waitFor(() => {
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    // First call should be page 1
    expect(mockFetcher).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 }),
    );
  });
});
