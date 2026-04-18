/**
 * Purpose: Render configurable spacing and dividers between creator-store sections.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://heroui.com/docs/react/components/separator
 * Tests:
 *   - packages/storefront/src/builder/builder.test.tsx
 */
import { Separator } from '@heroui/react';
import type { CSSProperties, ReactNode } from 'react';
import type { BlockDefinition } from '../types';

export interface SpacerBlockProps {
  readonly height?: number;
  readonly showDivider?: boolean;
  readonly children?: ReactNode;
}

export const spacerBlockDefinition: BlockDefinition = {
  type: 'spacer',
  label: 'Spacer',
  icon: 'separator-horizontal',
  defaultProps: {
    height: 32,
    showDivider: false,
  },
  propSchema: {
    fields: [
      { name: 'height', type: 'number', label: 'Height', required: true, defaultValue: 32 },
      { name: 'showDivider', type: 'boolean', label: 'Show divider', required: false, defaultValue: false },
    ],
  },
};

type SpacerStyle = CSSProperties & {
  '--builder-spacer-height': string;
};

export function SpacerBlock({
  height = 32,
  showDivider = false,
  children,
}: SpacerBlockProps) {
  const spacerStyle: SpacerStyle = {
    '--builder-spacer-height': `${height}px`,
  };

  return (
    <div
      data-testid="builder-spacer-block"
      style={spacerStyle}
      className="w-full"
    >
      {showDivider ? (
        <div className="flex flex-col gap-4 py-[calc(var(--builder-spacer-height)/2)]">
          <Separator />
          {children}
        </div>
      ) : (
        <div className="h-[var(--builder-spacer-height)]">{children}</div>
      )}
    </div>
  );
}
