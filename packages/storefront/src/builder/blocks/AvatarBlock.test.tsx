/**
 * Purpose: Verify HeroUI v3 avatar builder blocks show fallback and profile metadata.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://heroui.com/docs/react/components/avatar.mdx
 * Tests:
 *   - packages/storefront/src/builder/blocks/AvatarBlock.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvatarBlock } from './AvatarBlock';

describe('AvatarBlock', () => {
  it('renders creator metadata and fallback initials', () => {
    render(<AvatarBlock name="Jane Doe" subtitle="Indie tools creator" />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Indie tools creator')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
