/**
 * Purpose: Verify BentoHeroFrame renders shell color and core content.
 * Tests:
 *   - packages/storefront/src/components/today/BentoHeroFrame.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BentoHeroFrame } from './BentoHeroFrame';

describe('BentoHeroFrame', () => {
  it('applies configurable shell color to the root', () => {
    render(
      <BentoHeroFrame
        shellColor="#ff00aa"
        heroImage="https://cdn.example.com/hero.jpg"
        heroImageAlt="Spotlight"
        eyebrow="Featured"
        title="Campaign headline"
        productName="Product display name"
        creatorName="Creator Co."
        storyHref="/p/1"
        testId="spotlight-card"
      />,
    );

    const root = screen.getByTestId('spotlight-card');
    expect(root).toHaveAttribute('data-shell-color', '#ff00aa');
    expect(root).toHaveStyle({ borderColor: '#ff00aa', backgroundColor: '#ff00aa' });
  });

  it('renders headline, product name, creator, thumb, and read action', () => {
    const { container } = render(
      <BentoHeroFrame
        heroImage="https://cdn.example.com/hero.jpg"
        heroImageAlt="Spotlight"
        eyebrow="Featured"
        title="Test title"
        productName="My Product"
        creatorName="Jane Creator"
        productThumbnailUrl="https://cdn.example.com/thumb.png"
        storyHref="/editorial/x"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Test title' })).toBeInTheDocument();
    expect(screen.getByText('My Product')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jane Creator' })).toHaveAttribute('href', '/editorial/x');
    expect(container.querySelector('img[src="https://cdn.example.com/thumb.png"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
  });

  it('can show a price label and hide the CTA', () => {
    const { rerender } = render(
      <BentoHeroFrame
        heroImage="https://cdn.example.com/hero.jpg"
        heroImageAlt="Spotlight"
        eyebrow="FEATURED"
        title="T"
        productName="P"
        creatorName="C"
        storyHref="/x"
        spotlightCtaLabel="€35.00+"
      />,
    );

    expect(screen.getByRole('button', { name: '€35.00+' })).toBeInTheDocument();

    rerender(
      <BentoHeroFrame
        heroImage="https://cdn.example.com/hero.jpg"
        heroImageAlt="Spotlight"
        eyebrow="FEATURED"
        title="T"
        productName="P"
        creatorName="C"
        storyHref="/x"
        showSpotlightCta={false}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders optional subline and compact density', () => {
    render(
      <BentoHeroFrame
        heroImage="https://cdn.example.com/hero.jpg"
        heroImageAlt="Spotlight"
        eyebrow="PICK"
        title="Short"
        spotlightSubline="Extra context"
        density="compact"
        productName="P"
        creatorName="C"
        storyHref="/x"
      />,
    );

    expect(screen.getByText('Extra context')).toBeInTheDocument();
    expect(screen.getByTestId('bento-hero-frame')).toHaveAttribute('data-bento-density', 'compact');
  });
});
