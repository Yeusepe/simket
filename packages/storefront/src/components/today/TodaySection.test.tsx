/**
 * Purpose: Verify the Today section orchestrator renders loading, error, and
 * ordered editorial layouts from hook data.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://react.dev/reference/react
 * Tests:
 *   - packages/storefront/src/components/today/TodaySection.test.tsx
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useEditorialMock = vi.fn();

vi.mock('./use-editorial', () => ({
  useEditorial: () => useEditorialMock(),
}));

import { TodaySection } from './TodaySection';

function makeSection(
  overrides: Partial<{
    id: string;
    name: string;
    slug: string;
    layout: 'hero-banner' | 'card-grid-4' | 'card-grid-2' | 'horizontal-scroll';
    sortOrder: number;
  }> = {},
) {
  return {
    id: overrides.id ?? 'section-1',
    name: overrides.name ?? 'Section',
    slug: overrides.slug ?? 'section',
    layout: overrides.layout ?? 'card-grid-4',
    sortOrder: overrides.sortOrder ?? 1,
    items: [
      {
        id: 'item-1',
        title: 'Launch Day',
        excerpt: 'Short summary',
        heroImage: 'https://cdn.example.com/launch-day.jpg',
        author: 'Editorial Team',
        publishedAt: '2026-01-02T00:00:00.000Z',
        slug: 'launch-day',
        tags: ['launch'],
      },
    ],
  } as const;
}

describe('TodaySection', () => {
  beforeEach(() => {
    useEditorialMock.mockReset();
  });

  it('renders sections in sort order and maps layouts to components', () => {
    useEditorialMock.mockReturnValue({
      sections: [
        makeSection({ id: 'grid-4', name: 'Grid Four', layout: 'card-grid-4', sortOrder: 2 }),
        makeSection({ id: 'hero', name: 'Hero', layout: 'hero-banner', sortOrder: 1 }),
        makeSection({ id: 'scroll', name: 'Scroll', layout: 'horizontal-scroll', sortOrder: 4 }),
        makeSection({ id: 'grid-2', name: 'Grid Two', layout: 'card-grid-2', sortOrder: 3 }),
      ],
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    render(<TodaySection />);

    const renderedLayouts = screen.getAllByTestId(/today-layout-/).map((element) => element.dataset.testid);
    expect(renderedLayouts).toEqual([
      'today-layout-hero-banner',
      'today-layout-card-grid-4',
      'today-layout-card-grid-2',
      'today-layout-horizontal-scroll',
    ]);
    expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Grid Four' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Grid Two' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Scroll' })).toBeInTheDocument();
  });

  it('renders a loading skeleton state', () => {
    useEditorialMock.mockReturnValue({
      sections: [],
      isLoading: true,
      error: undefined,
      refetch: vi.fn(),
    });

    render(<TodaySection />);

    expect(screen.getAllByTestId('today-loading-skeleton')).toHaveLength(3);
  });

  it('renders an error state with retry', () => {
    const refetch = vi.fn();
    useEditorialMock.mockReturnValue({
      sections: [],
      isLoading: false,
      error: new Error('Editorial service unavailable'),
      refetch,
    });

    render(<TodaySection />);

    expect(screen.getByText(/editorial service unavailable/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
