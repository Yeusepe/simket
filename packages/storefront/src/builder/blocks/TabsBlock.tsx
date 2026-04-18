/**
 * Purpose: Render HeroUI v3 tabs for switching between creator-store content sections.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://heroui.com/docs/react/components/tabs.mdx
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/blocks/TabsBlock.test.tsx
 */
import { Tabs } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

type TabsVariant = 'primary' | 'secondary';
type TabsOrientation = 'horizontal' | 'vertical';

export interface TabsBlockItem {
  readonly id: string;
  readonly label: string;
  readonly content: string;
  readonly isDisabled?: boolean;
}

export interface TabsBlockProps {
  readonly heading?: string;
  readonly variant?: TabsVariant;
  readonly orientation?: TabsOrientation;
  readonly defaultSelectedKey?: string;
  readonly items?: readonly TabsBlockItem[];
  readonly children?: ReactNode;
}

export const tabsBlockDefinition: BlockDefinition = {
  type: 'tabs',
  label: 'Tabs',
  icon: 'folder-kanban',
  defaultProps: {
    heading: 'Explore this store',
    variant: 'primary',
    orientation: 'horizontal',
    defaultSelectedKey: 'featured',
    items: [
      {
        id: 'featured',
        label: 'Featured',
        content: 'Highlight flagship products, hero offers, or curated creator picks.',
      },
      {
        id: 'bundles',
        label: 'Bundles',
        content: 'Group complementary packs, templates, and add-ons into one shoppable section.',
      },
      {
        id: 'updates',
        label: 'Updates',
        content: 'Share changelogs, release notes, and roadmap milestones with returning buyers.',
      },
    ],
  },
  propSchema: {
    fields: [
      {
        name: 'heading',
        type: 'text',
        label: 'Heading',
        required: false,
        defaultValue: 'Explore this store',
      },
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        required: true,
        defaultValue: 'primary',
        options: ['primary', 'secondary'],
      },
      {
        name: 'orientation',
        type: 'select',
        label: 'Orientation',
        required: true,
        defaultValue: 'horizontal',
        options: ['horizontal', 'vertical'],
      },
      {
        name: 'defaultSelectedKey',
        type: 'text',
        label: 'Default tab id',
        required: false,
        defaultValue: 'featured',
      },
    ],
  },
};

export function TabsBlock({
  heading = 'Explore this store',
  variant = 'primary',
  orientation = 'horizontal',
  defaultSelectedKey,
  items = tabsBlockDefinition.defaultProps.items as readonly TabsBlockItem[],
  children,
}: TabsBlockProps) {
  const safeItems = items.length > 0 ? items : (tabsBlockDefinition.defaultProps.items as readonly TabsBlockItem[]);
  const fallbackSelectedKey =
    safeItems.find((item) => !item.isDisabled)?.id ?? safeItems[0]?.id;

  return (
    <section className="space-y-4">
      {heading ? <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2> : null}
      <Tabs
        className="w-full"
        defaultSelectedKey={defaultSelectedKey ?? fallbackSelectedKey}
        orientation={orientation}
        variant={variant}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={heading || 'Store tabs'}>
            {safeItems.map((item, index) => (
              <Tabs.Tab id={item.id} isDisabled={item.isDisabled} key={item.id}>
                {index > 0 ? <Tabs.Separator /> : null}
                {item.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {safeItems.map((item) => (
          <Tabs.Panel className="pt-4" id={item.id} key={`${item.id}-panel`}>
            <p className="text-sm text-foreground/80">{item.content}</p>
          </Tabs.Panel>
        ))}
      </Tabs>
      {children}
    </section>
  );
}
