/**
 * Purpose: Verify HeroUI v3 alert builder blocks render status messaging content.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://heroui.com/docs/react/components/alert.mdx
 * Tests:
 *   - packages/storefront/src/builder/blocks/AlertBlock.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlertBlock } from './AlertBlock';

describe('AlertBlock', () => {
  it('renders the alert title and description', () => {
    render(
      <AlertBlock
        description="Bundle launches every Friday."
        title="Creator schedule"
      />,
    );

    expect(screen.getByText('Creator schedule')).toBeInTheDocument();
    expect(screen.getByText('Bundle launches every Friday.')).toBeInTheDocument();
  });
});
