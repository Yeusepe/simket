/**
 * Purpose: Render persisted Framely page schemas into recursive React trees.
 * Governing docs:
 *   - docs/architecture.md §5 (Framely integration)
 *   - docs/domain-model.md §1 (FramelyProject, EditorElement)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import React, { type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { getBlock } from './block-registry.js';
import { validatePageSchema, type FramelyRenderContext, type PageBlock, type PageSchema, type ThemeOverrides } from './types.js';

void React;

type ThemeVariableStyle = CSSProperties & {
  '--builder-primary-color'?: string;
  '--builder-background-color'?: string;
  '--builder-font-family'?: string;
  '--builder-border-radius'?: string;
};

function buildThemeVariables(theme?: ThemeOverrides): ThemeVariableStyle {
  return {
    '--builder-primary-color': theme?.primaryColor,
    '--builder-background-color': theme?.backgroundColor,
    '--builder-font-family': theme?.fontFamily,
    '--builder-border-radius': theme?.borderRadius,
  };
}

function renderPageBlock(block: PageBlock, context?: FramelyRenderContext): ReactElement | null {
  const registeredBlock = getBlock(block.type);

  if (!registeredBlock) {
    return null;
  }

  const Component = registeredBlock.component;
  const renderedChildren =
    block.children
      ?.map((childBlock) => renderPageBlock(childBlock, context))
      .filter((child): child is ReactElement => child !== null) ?? [];

  const children: ReactNode = renderedChildren.length > 0 ? renderedChildren : undefined;

  return (
    <Component key={block.id} {...block.props} framelyContext={context}>
      {children}
    </Component>
  );
}

export function PageRenderer({
  schema,
  context,
}: {
  readonly schema: PageSchema;
  readonly context?: FramelyRenderContext;
}) {
  const validationResult = validatePageSchema(schema);

  if (!validationResult.success || schema.blocks.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="builder-page-renderer"
      style={buildThemeVariables(schema.theme)}
      className="flex flex-col gap-8 [font-family:var(--builder-font-family,inherit)]"
    >
      {schema.blocks.map((block) => renderPageBlock(block, context))}
    </div>
  );
}
