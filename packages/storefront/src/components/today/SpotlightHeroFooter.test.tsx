/**
 * Tests:
 *   - packages/storefront/src/components/today/SpotlightHeroFooter.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SpotlightHeroFooter } from './SpotlightHeroFooter';

describe('SpotlightHeroFooter', () => {
  it('renders product, creator, thumb, and CTA', () => {
    const onCta = vi.fn();
    render(
      <div className="text-white">
        <SpotlightHeroFooter
          productName="Long Product Name That Might Wrap"
          creatorName="Creator Studio"
          thumbnailSrc="https://cdn.example.com/t.png"
          storyHref="/story"
          onCtaPress={onCta}
        />
      </div>,
    );

    expect(screen.getByTestId('spotlight-hero-footer')).toBeInTheDocument();
    expect(screen.getByText('Long Product Name That Might Wrap')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Creator Studio' })).toHaveAttribute('href', '/story');
    expect(screen.getByRole('button', { name: /read more/i })).toBeInTheDocument();
  });
});
