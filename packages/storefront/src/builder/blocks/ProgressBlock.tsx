/**
 * Purpose: Render HeroUI v3 progress bars for storefront milestones, downloads, and campaign goals.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://heroui.com/docs/react/components/progress-bar
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/blocks/ProgressBlock.test.tsx
 */
import { Label, ProgressBar } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

type ProgressSize = 'sm' | 'md' | 'lg';
type ProgressColor = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export interface ProgressBlockProps {
  readonly label?: string;
  readonly value?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly size?: ProgressSize;
  readonly color?: ProgressColor;
  readonly isIndeterminate?: boolean;
  readonly showOutput?: boolean;
  readonly children?: ReactNode;
}

export const progressBlockDefinition: BlockDefinition = {
  type: 'progress',
  label: 'Progress',
  icon: 'chart-no-axes-column',
  defaultProps: {
    label: 'Launch progress',
    value: 72,
    minValue: 0,
    maxValue: 100,
    size: 'md',
    color: 'accent',
    isIndeterminate: false,
    showOutput: true,
  },
  propSchema: {
    fields: [
      {
        name: 'label',
        type: 'text',
        label: 'Label',
        required: true,
        defaultValue: 'Launch progress',
      },
      {
        name: 'value',
        type: 'number',
        label: 'Value',
        required: false,
        defaultValue: 72,
      },
      {
        name: 'minValue',
        type: 'number',
        label: 'Min value',
        required: false,
        defaultValue: 0,
      },
      {
        name: 'maxValue',
        type: 'number',
        label: 'Max value',
        required: false,
        defaultValue: 100,
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
        name: 'color',
        type: 'select',
        label: 'Color',
        required: true,
        defaultValue: 'accent',
        options: ['default', 'accent', 'success', 'warning', 'danger'],
      },
      {
        name: 'isIndeterminate',
        type: 'boolean',
        label: 'Indeterminate',
        required: false,
        defaultValue: false,
      },
      {
        name: 'showOutput',
        type: 'boolean',
        label: 'Show output',
        required: false,
        defaultValue: true,
      },
    ],
  },
};

export function ProgressBlock({
  label = 'Launch progress',
  value = 72,
  minValue = 0,
  maxValue = 100,
  size = 'md',
  color = 'accent',
  isIndeterminate = false,
  showOutput = true,
  children,
}: ProgressBlockProps) {
  return (
    <div className="flex flex-col gap-4">
      <ProgressBar
        aria-label={label}
        className="w-full max-w-md"
        color={color}
        isIndeterminate={isIndeterminate}
        maxValue={maxValue}
        minValue={minValue}
        size={size}
        value={value}
      >
        <Label>{label}</Label>
        {showOutput && !isIndeterminate ? <ProgressBar.Output /> : null}
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
      {children}
    </div>
  );
}
