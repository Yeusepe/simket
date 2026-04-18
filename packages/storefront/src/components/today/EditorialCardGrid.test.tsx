/**
 * Purpose: Verify editorial card grids render expected card counts and column
 * layouts for Today sections.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/today/EditorialCardGrid.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditorialCardGrid } from './EditorialCardGrid';

const items = [
  {
    id: 'item-1',
    title: 'One',
    excerpt: 'Excerpt one',
    heroImage: 'https://cdn.example.com/one.jpg',
    author: 'Editorial Team',
    publishedAt: '2026-01-02T00:00:00.000Z',
    slug: 'one',
    tags: ['alpha'],
  },
  {
    id: 'item-2',
    title: 'Two',
    excerpt: 'Excerpt two',
    heroImage: 'https://cdn.example.com/two.jpg',
    author: 'Editorial Team',
    publishedAt: '2026-01-03T00:00:00.000Z',
    slug: 'two',
    tags: ['beta'],
  },
] as const;

describe('EditorialCardGrid', () => {
  it('renders four-column grids', () => {
    render(<EditorialCardGrid title="Featured" items={items} columns={4} />);

    expect(screen.getByTestId('editorial-card-grid')).toHaveClass('xl:grid-cols-4');
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('renders two-column grids and wrapping layout classes', () => {
    render(<EditorialCardGrid title="Spotlight" items={items} columns={2} />);

    expect(screen.getByTestId('editorial-card-grid')).toHaveClass('grid', 'lg:grid-cols-2');
    expect(screen.getByRole('heading', { name: 'Spotlight' })).toBeInTheDocument();
  });
});
