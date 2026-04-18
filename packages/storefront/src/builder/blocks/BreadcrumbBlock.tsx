/**
 * Purpose: Render HeroUI v3 breadcrumbs for storefront navigation context and section hierarchy.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://heroui.com/docs/react/components/breadcrumbs.mdx
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/blocks/BreadcrumbBlock.test.tsx
 */
import { Breadcrumbs } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

export interface BreadcrumbBlockItem {
  readonly label: string;
  readonly href?: string;
}

export interface BreadcrumbBlockProps {
  readonly items?: readonly BreadcrumbBlockItem[];
  readonly isDisabled?: boolean;
  readonly children?: ReactNode;
}

export const breadcrumbBlockDefinition: BlockDefinition = {
  type: 'breadcrumb',
  label: 'Breadcrumbs',
  icon: 'waypoints',
  defaultProps: {
    isDisabled: false,
    items: [
      { label: 'Home', href: '/' },
      { label: 'Store', href: '/store' },
      { label: 'Featured bundles' },
    ],
  },
  propSchema: {
    fields: [
      {
        name: 'isDisabled',
        type: 'boolean',
        label: 'Disable links',
        required: false,
        defaultValue: false,
      },
    ],
  },
};

export function BreadcrumbBlock({
  items = breadcrumbBlockDefinition.defaultProps.items as readonly BreadcrumbBlockItem[],
  isDisabled = false,
  children,
}: BreadcrumbBlockProps) {
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs isDisabled={isDisabled}>
        {items.map((item) => (
          <Breadcrumbs.Item href={item.href} key={`${item.label}-${item.href ?? 'current'}`}>
            {item.label}
          </Breadcrumbs.Item>
        ))}
      </Breadcrumbs>
      {children}
    </div>
  );
}
