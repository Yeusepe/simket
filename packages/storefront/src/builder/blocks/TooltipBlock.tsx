/**
 * Purpose: Render HeroUI v3 tooltips for contextual storefront guidance and helper copy.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://heroui.com/docs/react/components/tooltip.mdx
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/blocks/TooltipBlock.test.tsx
 */
import { Button, Tooltip } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'outline'
  | 'ghost'
  | 'danger';
type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipBlockProps {
  readonly triggerLabel?: string;
  readonly content?: string;
  readonly triggerVariant?: ButtonVariant;
  readonly placement?: TooltipPlacement;
  readonly delay?: number;
  readonly closeDelay?: number;
  readonly showArrow?: boolean;
  readonly children?: ReactNode;
}

export const tooltipBlockDefinition: BlockDefinition = {
  type: 'tooltip',
  label: 'Tooltip',
  icon: 'message-circle-question',
  defaultProps: {
    triggerLabel: 'Shipping notes',
    content: 'Use tooltip copy for concise context around licensing, updates, or bundle eligibility.',
    triggerVariant: 'tertiary',
    placement: 'top',
    delay: 0,
    closeDelay: 0,
    showArrow: true,
  },
  propSchema: {
    fields: [
      {
        name: 'triggerLabel',
        type: 'text',
        label: 'Trigger label',
        required: true,
        defaultValue: 'Shipping notes',
      },
      {
        name: 'content',
        type: 'text',
        label: 'Tooltip content',
        required: true,
        defaultValue: 'Use tooltip copy for concise context around licensing, updates, or bundle eligibility.',
      },
      {
        name: 'placement',
        type: 'select',
        label: 'Placement',
        required: true,
        defaultValue: 'top',
        options: ['top', 'bottom', 'left', 'right'],
      },
      {
        name: 'delay',
        type: 'number',
        label: 'Show delay',
        required: false,
        defaultValue: 0,
      },
      {
        name: 'closeDelay',
        type: 'number',
        label: 'Hide delay',
        required: false,
        defaultValue: 0,
      },
      {
        name: 'showArrow',
        type: 'boolean',
        label: 'Show arrow',
        required: false,
        defaultValue: true,
      },
    ],
  },
};

export function TooltipBlock({
  triggerLabel = 'Shipping notes',
  content = 'Use tooltip copy for concise context around licensing, updates, or bundle eligibility.',
  triggerVariant = 'tertiary',
  placement = 'top',
  delay = 0,
  closeDelay = 0,
  showArrow = true,
  children,
}: TooltipBlockProps) {
  return (
    <Tooltip closeDelay={closeDelay} delay={delay}>
      <Tooltip.Trigger>
        <Button variant={triggerVariant}>{triggerLabel}</Button>
      </Tooltip.Trigger>
      <Tooltip.Content placement={placement} showArrow={showArrow}>
        {showArrow ? <Tooltip.Arrow /> : null}
        <div className="max-w-xs space-y-2">
          <p>{content}</p>
          {children}
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
}
