/**
 * Purpose: Verify Today horizontal-scroll rows render cards and hover-revealed
 * navigation controls.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/today/HorizontalScroll.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HorizontalScroll } from './HorizontalScroll';

const items = [
  {
    id: 'item-1',
    title: 'First',
    excerpt: 'First excerpt',
    heroImage: 'https://cdn.example.com/first.jpg',
    author: 'Editorial Team',
    publishedAt: '2026-01-02T00:00:00.000Z',
    slug: 'first',
    tags: ['first'],
  },
  {
    id: 'item-2',
    title: 'Second',
    excerpt: 'Second excerpt',
    heroImage: 'https://cdn.example.com/second.jpg',
    author: 'Editorial Team',
    publishedAt: '2026-01-03T00:00:00.000Z',
    slug: 'second',
    tags: ['second'],
  },
] as const;

describe('HorizontalScroll', () => {
  it('renders a horizontally scrollable row of cards', () => {
    render(<HorizontalScroll title="Fresh Picks" items={items} />);

    expect(screen.getByRole('region', { name: 'Fresh Picks' })).toBeInTheDocument();
    expect(screen.getByTestId('horizontal-scroll-track')).toHaveClass('snap-x', 'overflow-x-auto');
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('renders hover-revealed left and right scroll arrows', () => {
    render(<HorizontalScroll title="Fresh Picks" items={items} />);

    expect(screen.getByRole('button', { name: /scroll left/i })).toHaveClass(
      'opacity-0',
      'group-hover:opacity-100',
    );
    expect(screen.getByRole('button', { name: /scroll right/i })).toHaveClass(
      'opacity-0',
      'group-hover:opacity-100',
    );
  });
});
