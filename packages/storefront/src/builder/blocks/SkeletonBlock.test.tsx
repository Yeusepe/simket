/**
 * Purpose: Verify HeroUI v3 skeleton builder blocks render expected placeholder counts and headings.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://heroui.com/docs/react/components/skeleton.mdx
 * Tests:
 *   - packages/storefront/src/builder/blocks/SkeletonBlock.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkeletonBlock } from './SkeletonBlock';

describe('SkeletonBlock', () => {
  it('renders the configured placeholder layout', () => {
    render(<SkeletonBlock heading="Loading cards" variant="grid" />);

    expect(screen.getByText('Loading cards')).toBeInTheDocument();
    expect(screen.getAllByTestId('builder-skeleton-item')).toHaveLength(3);
  });
});
