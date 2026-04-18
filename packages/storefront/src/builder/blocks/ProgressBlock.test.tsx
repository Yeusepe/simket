/**
 * Purpose: Verify HeroUI v3 progress bars render builder-defined labels and outputs.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://heroui.com/docs/react/components/progress-bar
 * Tests:
 *   - packages/storefront/src/builder/blocks/ProgressBlock.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBlock } from './ProgressBlock';

describe('ProgressBlock', () => {
  it('renders the progressbar with label and formatted output', () => {
    render(<ProgressBlock label="Loading assets" value={64} />);

    expect(screen.getByRole('progressbar', { name: /loading assets/i })).toBeInTheDocument();
    expect(screen.getByText('Loading assets')).toBeInTheDocument();
    expect(screen.getByText('64%')).toBeInTheDocument();
  });
});
