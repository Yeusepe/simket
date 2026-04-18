/**
 * Purpose: Verify the Today hero banner renders imagery, metadata, CTA, and
 * responsive layout classes.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/today/HeroBanner.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroBanner } from './HeroBanner';

const heroItem = {
  id: 'hero-item',
  title: 'The Future of Marketplace Curation',
  excerpt: 'A guided look at today’s featured release slate.',
  heroImage: 'https://cdn.example.com/hero.jpg',
  heroTransparent: 'https://cdn.example.com/hero-transparent.png',
  author: 'Simket Editorial',
  publishedAt: '2026-01-02T00:00:00.000Z',
  slug: 'future-of-marketplace-curation',
  tags: ['featured', 'insight'],
} as const;

describe('HeroBanner', () => {
  it('renders the hero image, title, and CTA', () => {
    render(<HeroBanner item={heroItem} />);

    expect(screen.getByRole('img', { name: heroItem.title })).toHaveAttribute('src', heroItem.heroImage);
    expect(screen.getByRole('heading', { name: heroItem.title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
  });

  it('renders the transparent depth layer when provided', () => {
    render(<HeroBanner item={heroItem} />);

    expect(screen.getByTestId('hero-banner-depth-image')).toHaveAttribute(
      'src',
      heroItem.heroTransparent,
    );
  });

  it('uses responsive layout classes', () => {
    render(<HeroBanner item={heroItem} />);

    expect(screen.getByTestId('hero-banner')).toHaveClass('grid', 'lg:grid-cols-[minmax(0,1fr)_18rem]');
  });
});
