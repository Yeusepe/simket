/**
 * Purpose: Verify the shared storefront icon wrapper stays on the Streamline Flex flat set.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 * External references:
 *   - https://www.streamlinehq.com/icons/flex-flat-style
 *   - https://icon-sets.iconify.design/streamline-flex/
 *   - https://iconify.design/docs/icon-components/react/
 * Tests:
 *   - packages/storefront/src/components/common/Icon.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Icon } from './Icon';

vi.mock('@iconify/react', () => ({
  Icon: ({
    icon,
    width,
    height,
    className,
    'aria-hidden': ariaHidden,
  }: {
    icon: string;
    width?: number | string;
    height?: number | string;
    className?: string;
    'aria-hidden'?: boolean;
  }) => (
    <span
      data-testid="icon"
      data-icon={icon}
      data-width={String(width ?? '')}
      data-height={String(height ?? '')}
      data-class-name={className ?? ''}
      data-aria-hidden={String(ariaHidden ?? '')}
    />
  ),
}));

describe('Icon', () => {
  it('renders navigation icons from the Streamline Flex flat set', () => {
    render(<Icon name="home" size={24} className="text-accent" />);

    expect(screen.getByTestId('icon')).toHaveAttribute(
      'data-icon',
      'streamline-flex:home-2-solid',
    );
    expect(screen.getByTestId('icon')).toHaveAttribute('data-width', '24');
    expect(screen.getByTestId('icon')).toHaveAttribute('data-height', '24');
    expect(screen.getByTestId('icon')).toHaveAttribute('data-class-name', 'text-accent');
    expect(screen.getByTestId('icon')).toHaveAttribute('data-aria-hidden', 'true');
  });

  it('keeps filled and outline wishlist icons distinct within Streamline Flex', () => {
    const { rerender } = render(<Icon name="heart-filled" />);
    expect(screen.getByTestId('icon')).toHaveAttribute('data-icon', 'streamline-flex:heart-solid');

    rerender(<Icon name="heart-outline" />);
    expect(screen.getByTestId('icon')).toHaveAttribute('data-icon', 'streamline-flex:heart');
  });

  it('uses the requested flex-flat replacements for theme and dismiss actions', () => {
    const { rerender } = render(<Icon name="moon" />);
    expect(screen.getByTestId('icon')).toHaveAttribute(
      'data-icon',
      'streamline-flex:dark-dislay-mode-solid',
    );

    rerender(<Icon name="close" />);
    expect(screen.getByTestId('icon')).toHaveAttribute(
      'data-icon',
      'streamline-flex:shield-cross-solid',
    );
  });
});
