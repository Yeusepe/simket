/**
 * Purpose: Verify HeroUI v3 breadcrumbs render hierarchical storefront navigation in builder blocks.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://heroui.com/docs/react/components/breadcrumbs.mdx
 * Tests:
 *   - packages/storefront/src/builder/blocks/BreadcrumbBlock.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BreadcrumbBlock } from './BreadcrumbBlock';

describe('BreadcrumbBlock', () => {
  it('renders linked crumbs and the current page', () => {
    render(
      <BreadcrumbBlock
        items={[
          { label: 'Home', href: '/' },
          { label: 'Store', href: '/store' },
          { label: 'Current page' },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /store/i })).toHaveAttribute('href', '/store');
    expect(screen.getByText('Current page')).toBeInTheDocument();
  });
});
