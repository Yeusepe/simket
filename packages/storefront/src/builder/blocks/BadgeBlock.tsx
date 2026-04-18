/**
 * Purpose: Render HeroUI v3 badges anchored to storefront labels, cards, or status targets.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://heroui.com/docs/react/components/badge.mdx
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/blocks/BadgeBlock.test.tsx
 */
import { Badge } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

type BadgeColor = 'default' | 'accent' | 'success' | 'warning' | 'danger';
type BadgeVariant = 'primary' | 'secondary' | 'soft';
type BadgeSize = 'sm' | 'md' | 'lg';
type BadgePlacement = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface BadgeBlockProps {
  readonly anchorLabel?: string;
  readonly badgeContent?: string;
  readonly color?: BadgeColor;
  readonly variant?: BadgeVariant;
  readonly size?: BadgeSize;
  readonly placement?: BadgePlacement;
  readonly showDot?: boolean;
  readonly children?: ReactNode;
}

export const badgeBlockDefinition: BlockDefinition = {
  type: 'badge',
  label: 'Badge',
  icon: 'badge',
  defaultProps: {
    anchorLabel: 'Creator perks',
    badgeContent: 'New',
    color: 'accent',
    variant: 'primary',
    size: 'md',
    placement: 'top-right',
    showDot: false,
  },
  propSchema: {
    fields: [
      {
        name: 'anchorLabel',
        type: 'text',
        label: 'Anchor label',
        required: true,
        defaultValue: 'Creator perks',
      },
      {
        name: 'badgeContent',
        type: 'text',
        label: 'Badge content',
        required: false,
        defaultValue: 'New',
      },
      {
        name: 'color',
        type: 'select',
        label: 'Color',
        required: true,
        defaultValue: 'accent',
        options: ['default', 'accent', 'success', 'warning', 'danger'],
      },
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        required: true,
        defaultValue: 'primary',
        options: ['primary', 'secondary', 'soft'],
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
        name: 'placement',
        type: 'select',
        label: 'Placement',
        required: true,
        defaultValue: 'top-right',
        options: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
      },
      {
        name: 'showDot',
        type: 'boolean',
        label: 'Dot only',
        required: false,
        defaultValue: false,
      },
    ],
  },
};

export function BadgeBlock({
  anchorLabel = 'Creator perks',
  badgeContent = 'New',
  color = 'accent',
  variant = 'primary',
  size = 'md',
  placement = 'top-right',
  showDot = false,
  children,
}: BadgeBlockProps) {
  return (
    <div className="flex flex-col gap-4">
      <Badge.Anchor>
        <div className="min-w-44 rounded-[var(--builder-border-radius,1.5rem)] border border-default-200 bg-content2 px-5 py-6 text-center text-sm font-medium">
          {anchorLabel}
        </div>
        <Badge color={color} placement={placement} size={size} variant={variant}>
          {showDot ? null : badgeContent}
        </Badge>
      </Badge.Anchor>
      {children}
    </div>
  );
}
