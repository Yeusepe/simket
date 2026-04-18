/**
 * Purpose: Define TDD coverage for the creator-store builder schema, registry, blocks, and hook.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing and change-safety)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 *   - https://dev.to/belastrittmatter/building-a-nextjs-website-editor-bj3
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/builder/builder.test.tsx
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ComponentType } from 'react';
import {
  CURRENT_PAGE_SCHEMA_VERSION,
  createPageSchema,
  validatePageSchema,
  type BlockDefinition,
  type PageSchema,
} from './types';
import { ButtonBlock, buttonBlockDefinition } from './blocks/button-block';
import { CardGridBlock, cardGridBlockDefinition } from './blocks/card-grid-block';
import { GalleryBlock } from './blocks/gallery-block';
import { HeroBlock, heroBlockDefinition } from './blocks/hero-block';
import { SpacerBlock, spacerBlockDefinition } from './blocks/spacer-block';
import { TestimonialBlock } from './blocks/testimonial-block';
import { TextBlock } from './blocks/text-block';
import { getAllBlocks, getBlock, registerBlock } from './block-registry';
import { useBuilder } from './use-builder';

function makeSchema(overrides: Partial<PageSchema> = {}): PageSchema {
  return {
    version: CURRENT_PAGE_SCHEMA_VERSION,
    blocks: [],
    ...overrides,
  };
}

describe('validatePageSchema', () => {
  it('accepts the current schema version with an empty block array', () => {
    const schema = makeSchema();

    expect(validatePageSchema(schema)).toEqual({
      success: true,
      errors: [],
    });
  });

  it('rejects unsupported schema versions', () => {
    const schema = makeSchema({ version: 999 });

    expect(validatePageSchema(schema)).toEqual({
      success: false,
      errors: ['Unsupported page schema version: 999'],
    });
  });

  it('rejects blocks without required identifiers', () => {
    const schema = makeSchema({
      blocks: [{ id: '', type: '', props: {} }],
    });

    expect(validatePageSchema(schema)).toEqual({
      success: false,
      errors: [
        'Block at index 0 must include a non-empty id.',
        'Block at index 0 must include a non-empty type.',
      ],
    });
  });
});

describe('block registry', () => {
  it('returns pre-registered HeroUI block definitions', () => {
    const blockTypes = getAllBlocks().map((definition) => definition.type);

    expect(blockTypes).toEqual(
      expect.arrayContaining([
        heroBlockDefinition.type,
        buttonBlockDefinition.type,
        cardGridBlockDefinition.type,
        spacerBlockDefinition.type,
      ]),
    );
  });

  it('registers and resolves custom block definitions', () => {
    const definition: BlockDefinition = {
      type: 'test-custom-block',
      label: 'Test custom block',
      icon: 'test',
      defaultProps: { label: 'Custom' },
      propSchema: {
        fields: [
          {
            name: 'label',
            type: 'text',
            label: 'Label',
            required: true,
            defaultValue: 'Custom',
          },
        ],
      },
    };

    const Component: ComponentType = () => <div>Custom block</div>;

    registerBlock(definition, Component);

    expect(getBlock(definition.type)).toEqual({
      definition,
      component: Component,
    });
  });

  it('returns undefined for unknown block types', () => {
    expect(getBlock('missing-block')).toBeUndefined();
  });
});

describe('block components', () => {
  it('renders the hero block with default-like props', () => {
    render(
      <HeroBlock
        title="Creator store"
        subtitle="Build your own storefront"
        ctaLabel="Browse drops"
        ctaHref="/drops"
      />,
    );

    expect(screen.getByText('Creator store')).toBeInTheDocument();
    expect(screen.getByText('Build your own storefront')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse drops/i })).toHaveAttribute(
      'href',
      '/drops',
    );
  });

  it('renders the button block with a custom link', () => {
    render(
      <ButtonBlock
        label="Read release notes"
        href="https://example.com/releases"
      />,
    );

    expect(
      screen.getByRole('link', { name: /read release notes/i }),
    ).toHaveAttribute('href', 'https://example.com/releases');
  });

  it('renders spacer block height for layout composition', () => {
    render(<SpacerBlock height={48} />);

    expect(screen.getByTestId('builder-spacer-block')).toHaveAttribute(
      'style',
      expect.stringContaining('--builder-spacer-height: 48px'),
    );
  });

  it('renders card grid items with custom content', () => {
    render(
      <CardGridBlock
        cards={[
          {
            id: 'product-1',
            title: 'Shader pack',
            description: 'Realtime shaders for stylized scenes.',
            price: '$22.00',
            href: '/products/shader-pack',
            tags: ['Shaders'],
          },
        ]}
        columns={2}
        heading="Featured"
      />,
    );

    expect(screen.getByText('Shader pack')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute(
      'href',
      '/products/shader-pack',
    );
  });

  it('renders gallery media and captions', () => {
    render(
      <GalleryBlock
        items={[
          {
            id: 'gallery-1',
            src: 'https://cdn.example.com/preview.png',
            alt: 'Preview',
            caption: 'Latest drop',
          },
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getByText('Latest drop')).toBeInTheDocument();
  });

  it('renders testimonial details and rating', () => {
    render(
      <TestimonialBlock
        authorName="Alex Builder"
        authorTitle="3D artist"
        quote="Exactly the storefront flexibility I needed."
        rating={4}
      />,
    );

    expect(screen.getByText(/alex builder/i)).toBeInTheDocument();
    expect(screen.getByText(/3d artist/i)).toBeInTheDocument();
    expect(screen.getByText('4/5')).toBeInTheDocument();
  });

  it('renders text block content through TipTap read-only output', () => {
    render(
      <TextBlock
        content={{
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Builder rich text content' }],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Builder rich text content')).toBeInTheDocument();
  });
});

describe('useBuilder', () => {
  it('adds blocks using registered defaults and marks the schema dirty', () => {
    const { result } = renderHook(() => useBuilder());

    act(() => {
      result.current.actions.addBlock('button');
    });

    expect(result.current.schema.blocks).toHaveLength(1);
    expect(result.current.schema.blocks[0]?.type).toBe('button');
    expect(result.current.selectedBlock?.props).toEqual(
      expect.objectContaining(buttonBlockDefinition.defaultProps),
    );
    expect(result.current.isDirty).toBe(true);
  });

  it('updates block props, selection, theme, order, and removal', () => {
    const initialSchema = createPageSchema({
      blocks: [
        {
          id: 'hero-1',
          type: 'hero',
          props: { ...heroBlockDefinition.defaultProps, title: 'Welcome' },
        },
        {
          id: 'button-1',
          type: 'button',
          props: { ...buttonBlockDefinition.defaultProps, label: 'Buy now' },
        },
      ],
    });

    const { result } = renderHook(() => useBuilder(initialSchema));

    act(() => {
      result.current.actions.selectBlock('hero-1');
      result.current.actions.updateBlockProps('hero-1', { title: 'Updated hero' });
      result.current.actions.moveBlock('button-1', -1);
      result.current.actions.setTheme({ primaryColor: '#6633ff' });
      result.current.actions.removeBlock('hero-1');
    });

    expect(result.current.schema.blocks.map((block) => block.id)).toEqual(['button-1']);
    expect(result.current.schema.theme).toEqual({ primaryColor: '#6633ff' });
    expect(result.current.selectedBlock?.id).toBe('button-1');
    expect(result.current.isDirty).toBe(true);
  });
});
