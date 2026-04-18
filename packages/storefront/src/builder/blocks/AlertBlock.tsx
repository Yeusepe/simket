/**
 * Purpose: Render HeroUI v3 alert banners for creator updates, warnings, and status messaging.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://heroui.com/docs/react/components/alert.mdx
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/blocks/AlertBlock.test.tsx
 */
import { Alert } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

type AlertStatus = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export interface AlertBlockProps {
  readonly title?: string;
  readonly description?: string;
  readonly status?: AlertStatus;
  readonly showIndicator?: boolean;
  readonly children?: ReactNode;
}

export const alertBlockDefinition: BlockDefinition = {
  type: 'alert',
  label: 'Alert',
  icon: 'triangle-alert',
  defaultProps: {
    title: 'Bundle updated',
    description: 'Let customers know about storewide sales, delivery changes, or maintenance windows.',
    status: 'accent',
    showIndicator: true,
  },
  propSchema: {
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Title',
        required: true,
        defaultValue: 'Bundle updated',
      },
      {
        name: 'description',
        type: 'text',
        label: 'Description',
        required: false,
        defaultValue: 'Let customers know about storewide sales, delivery changes, or maintenance windows.',
      },
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        required: true,
        defaultValue: 'accent',
        options: ['default', 'accent', 'success', 'warning', 'danger'],
      },
      {
        name: 'showIndicator',
        type: 'boolean',
        label: 'Show indicator',
        required: false,
        defaultValue: true,
      },
    ],
  },
};

export function AlertBlock({
  title = 'Bundle updated',
  description = 'Let customers know about storewide sales, delivery changes, or maintenance windows.',
  status = 'accent',
  showIndicator = true,
  children,
}: AlertBlockProps) {
  return (
    <Alert status={status}>
      {showIndicator ? <Alert.Indicator /> : null}
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        {description ? <Alert.Description>{description}</Alert.Description> : null}
        {children}
      </Alert.Content>
    </Alert>
  );
}
