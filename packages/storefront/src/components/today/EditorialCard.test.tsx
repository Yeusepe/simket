/**
 * Purpose: Verify editorial cards render image, metadata, tags, and interactive
 * styles for Today sections.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/today/EditorialCard.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditorialCard } from './EditorialCard';

const item = {
  id: 'item-1',
  title: 'Today’s Standout Release',
  excerpt: 'A longer editorial summary that should still clamp neatly inside the card layout.',
  heroImage: 'https://cdn.example.com/card.jpg',
  heroTransparent: 'https://cdn.example.com/card-transparent.png',
  author: 'Simket Editorial',
  publishedAt: '2026-01-02T00:00:00.000Z',
  slug: 'todays-standout-release',
  tags: ['featured', 'tools'],
} as const;

describe('EditorialCard', () => {
  it('renders image, title, excerpt, and tags', () => {
    render(<EditorialCard item={item} />);

    expect(screen.getByRole('img', { name: item.title })).toHaveAttribute('src', item.heroImage);
    expect(screen.getByRole('heading', { name: item.title })).toBeInTheDocument();
    expect(screen.getByTestId('editorial-card-excerpt')).toHaveTextContent(item.excerpt);
    expect(screen.getByText('featured')).toBeInTheDocument();
    expect(screen.getByText('tools')).toBeInTheDocument();
  });

  it('links to the editorial detail route and applies hover styling', () => {
    render(<EditorialCard item={item} />);

    expect(screen.getByRole('link', { name: item.title })).toHaveAttribute(
      'href',
      '/editorial/todays-standout-release',
    );
    expect(screen.getByTestId('editorial-card')).toHaveClass('transition-transform', 'hover:-translate-y-1');
  });

  it('clamps the excerpt and renders transparent artwork when available', () => {
    render(<EditorialCard item={item} />);

    expect(screen.getByTestId('editorial-card-excerpt')).toHaveClass('line-clamp-2');
    expect(screen.getByTestId('editorial-card-depth-image')).toHaveAttribute(
      'src',
      item.heroTransparent,
    );
  });
});
