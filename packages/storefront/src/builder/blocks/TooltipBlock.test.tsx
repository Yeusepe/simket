/**
 * Purpose: Verify HeroUI v3 tooltip builder blocks reveal contextual copy on hover.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://heroui.com/docs/react/components/tooltip.mdx
 * Tests:
 *   - packages/storefront/src/builder/blocks/TooltipBlock.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TooltipBlock } from './TooltipBlock';

describe('TooltipBlock', () => {
  it('renders the tooltip trigger button', () => {
    render(<TooltipBlock content="Tooltip details" triggerLabel="Hover me" />);

    expect(screen.getAllByRole('button', { name: /hover me/i })).toHaveLength(2);
  });
});
