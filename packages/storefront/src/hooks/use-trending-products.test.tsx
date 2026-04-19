/**
 * Tests:
 *   - packages/storefront/src/hooks/use-trending-products.test.tsx
 */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MOCK_PRODUCTS } from '../mock-data';
import { useTrendingProducts } from './use-trending-products';

function wrapper(client: QueryClient) {
  return function Provider({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useTrendingProducts', () => {
  it('returns mock catalog products', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useTrendingProducts(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(0);
    expect(result.current.data?.[0]?.slug).toBe(MOCK_PRODUCTS[0]?.slug);
  });
});
