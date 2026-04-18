/**
 * Purpose: Verify HeroUI v3 badges render anchored content for builder layouts.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://heroui.com/docs/react/components/badge.mdx
 * Tests:
 *   - packages/storefront/src/builder/blocks/BadgeBlock.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BadgeBlock } from './BadgeBlock';

describe('BadgeBlock', () => {
  it('renders the anchor and badge content', () => {
    render(<BadgeBlock anchorLabel="Subscriber access" badgeContent="Beta" />);

    expect(screen.getByText('Subscriber access')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });
});
