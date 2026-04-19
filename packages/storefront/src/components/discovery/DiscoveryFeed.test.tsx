/**
 * Purpose: Verify the discovery feed renders cards, loading/error/end states,
 * and triggers infinite-scroll loading through IntersectionObserver.
 *
 * Governing docs:
 *   - docs/architecture.md (§6 storefront discovery)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/discovery/DiscoveryFeed.test.tsx
 */

import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscoveryFeed } from './DiscoveryFeed';
import type { DiscoveryFeedItem } from './discovery-types';
import type { UseDiscoveryReturn } from './use-discovery';

function renderWithRouter(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

function makeDiscoveryItem(
  index: number,
  overrides: Partial<DiscoveryFeedItem> = {},
): DiscoveryFeedItem {
  return {
    productId: `product-${index}`,
    slug: `product-${index}`,
    name: `Discovery Product ${index}`,
    imageUrl: `https://cdn.example.com/products/${index}.webp`,
    price: 1000 + index,
    currencyCode: 'USD',
    creatorName: `Creator ${index}`,
    reason: `Because you bought Collection ${index}`,
    score: 0.9 - index / 100,
    source: 'purchase-history',
    variantId: `variant-${index}`,
    ...overrides,
  };
}

function createHookValue(
  overrides: Partial<UseDiscoveryReturn> = {},
): UseDiscoveryReturn {
  return {
    items: [makeDiscoveryItem(1), makeDiscoveryItem(2)],
    isLoading: false,
    hasMore: true,
    error: null,
    loadMore: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined),
    ...overrides,
  };
}

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  constructor(
    public readonly callback: IntersectionObserverCallback,
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = '0px';
  thresholds = [0];
}

describe('DiscoveryFeed', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: MockIntersectionObserver,
    });
  });

  it('renders recommendation cards from the discovery hook', () => {
    const hookValue = createHookValue();

    renderWithRouter(
      <DiscoveryFeed
        userId="user-1"
        useDiscoveryHook={() => hookValue}
      />,
    );

    expect(screen.getByText('Discovery Product 1')).toBeInTheDocument();
    expect(screen.getByText('Discovery Product 2')).toBeInTheDocument();
  });

  it('shows loading skeletons while the first page is fetching', () => {
    renderWithRouter(
      <DiscoveryFeed
        userId="user-1"
        useDiscoveryHook={() =>
          createHookValue({ items: [], isLoading: true })
        }
      />,
    );

    expect(screen.getAllByTestId('discovery-card-skeleton')).toHaveLength(4);
  });

  it('shows the end-of-feed state when there are no more recommendations', () => {
    renderWithRouter(
      <DiscoveryFeed
        userId="user-1"
        useDiscoveryHook={() =>
          createHookValue({ hasMore: false })
        }
      />,
    );

    expect(
      screen.getByText('No more recommendations'),
    ).toBeInTheDocument();
  });

  it('shows an error state with retry', () => {
    const retry = vi.fn(async () => undefined);

    renderWithRouter(
      <DiscoveryFeed
        userId="user-1"
        useDiscoveryHook={() =>
          createHookValue({
            items: [],
            error: new Error('Discovery failed'),
            retry,
          })
        }
      />,
    );

    expect(screen.getByText('Discovery failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('requests another page when the sentinel intersects', () => {
    const loadMore = vi.fn(async () => undefined);

    renderWithRouter(
      <DiscoveryFeed
        userId="user-1"
        useDiscoveryHook={() => createHookValue({ loadMore })}
      />,
    );

    const observer = MockIntersectionObserver.instances[0];
    expect(observer).toBeDefined();

    observer!.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      observer as unknown as IntersectionObserver,
    );

    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
