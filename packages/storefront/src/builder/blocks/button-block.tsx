/**
 * Purpose: Render a configurable CTA button block using HeroUI v3 button patterns.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://heroui.com/docs/react/components/button
 *   - https://heroui.com/docs/react/components/link
 * Tests:
 *   - packages/storefront/src/builder/builder.test.tsx
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import { Link } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'outline'
  | 'ghost'
  | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonBlockProps {
  readonly label?: string;
  readonly href?: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
  readonly isDisabled?: boolean;
  readonly children?: ReactNode;
}

export const buttonBlockDefinition: BlockDefinition = {
  type: 'button',
  label: 'Button',
  icon: 'mouse-pointer',
  defaultProps: {
    label: 'Shop now',
    href: '#',
    variant: 'primary',
    size: 'md',
    fullWidth: false,
    isDisabled: false,
  },
  propSchema: {
    fields: [
      {
        name: 'label',
        type: 'text',
        label: 'Label',
        required: true,
        defaultValue: 'Shop now',
      },
      {
        name: 'href',
        type: 'url',
        label: 'Link',
        required: false,
        defaultValue: '#',
      },
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        required: true,
        defaultValue: 'primary',
        options: ['primary', 'secondary', 'tertiary', 'outline', 'ghost', 'danger'],
      },
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        required: true,
        defaultValue: 'md',
        options: ['sm', 'md', 'lg'],
      },
      {
        name: 'fullWidth',
        type: 'boolean',
        label: 'Full width',
        required: false,
        defaultValue: false,
      },
      {
        name: 'isDisabled',
        type: 'boolean',
        label: 'Disabled',
        required: false,
        defaultValue: false,
      },
    ],
  },
};

function getButtonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
): string {
  return [
    'button',
    `button--${variant}`,
    `button--${size}`,
    fullWidth ? 'w-full justify-center' : 'inline-flex',
  ].join(' ');
}

export function ButtonBlock({
  label = 'Shop now',
  href = '#',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isDisabled = false,
  children,
}: ButtonBlockProps) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        aria-disabled={isDisabled}
        className={getButtonClassName(variant, size, fullWidth)}
        href={isDisabled ? undefined : href}
        isDisabled={isDisabled}
      >
        {label}
      </Link>
      {children}
    </div>
  );
}
