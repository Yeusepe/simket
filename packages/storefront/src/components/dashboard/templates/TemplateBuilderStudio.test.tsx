/**
 * Purpose: Verify the configurable dashboard builder studio adds blocks,
 *          edits selected block props, and exposes preview-device controls.
 * Governing docs:
 *   - docs/architecture.md (§5 Framely integration, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§7.7 Storefront plugin)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://heroui.com/docs/react/components/search-field
 *   - https://heroui.com/docs/react/components/text-area
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/TemplateBuilderStudio.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useMemo, useState } from 'react';
import {
  createPageSchema,
  getBlock,
  type PageBlock,
  type PageSchema,
} from '../../../builder';
import { DashboardPreferencesProvider } from '../dashboard-preferences';
import { TemplateBuilderStudio } from './TemplateBuilderStudio';

type StudioBuilder = Parameters<typeof TemplateBuilderStudio>[0]['builder'];

function findBlockById(blocks: readonly PageBlock[], blockId: string): PageBlock | null {
  for (const block of blocks) {
    if (block.id === blockId) {
      return block;
    }

    if (block.children) {
      const childMatch = findBlockById(block.children, blockId);
      if (childMatch) {
        return childMatch;
      }
    }
  }

  return null;
}

function updateBlockTree(
  blocks: readonly PageBlock[],
  blockId: string,
  updater: (block: PageBlock) => PageBlock | null,
): readonly PageBlock[] {
  return blocks.flatMap((block) => {
    if (block.id === blockId) {
      const nextBlock = updater(block);
      return nextBlock ? [nextBlock] : [];
    }

    if (!block.children) {
      return [block];
    }

    return [
      {
        ...block,
        children: updateBlockTree(block.children, blockId, updater),
      },
    ];
  });
}

function useStudioBuilder(initialSchema = createPageSchema()): StudioBuilder {
  const [schema, setSchema] = useState<PageSchema>(initialSchema);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(initialSchema.blocks[0]?.id ?? null);
  const [isDirty, setIsDirty] = useState(false);

  const selectedBlock = useMemo(
    () => (selectedBlockId ? findBlockById(schema.blocks, selectedBlockId) : null),
    [schema.blocks, selectedBlockId],
  );

  return {
    schema,
    selectedBlockId,
    selectedBlock,
    isDirty,
    actions: {
      addBlock(blockType) {
        const blockDefinition = getBlock(blockType)?.definition;
        if (!blockDefinition) {
          return;
        }

        const nextBlock: PageBlock = {
          id: `${blockType}-${schema.blocks.length + 1}`,
          type: blockType,
          props: structuredClone(blockDefinition.defaultProps),
        };

        setSchema((currentSchema) => ({
          ...currentSchema,
          blocks: [...currentSchema.blocks, nextBlock],
        }));
        setSelectedBlockId(nextBlock.id);
        setIsDirty(true);
      },
      selectBlock(blockId) {
        setSelectedBlockId(blockId);
      },
      updateBlockProps(blockId, props) {
        setSchema((currentSchema) => ({
          ...currentSchema,
          blocks: updateBlockTree(currentSchema.blocks, blockId, (block) => ({
            ...block,
            props: {
              ...block.props,
              ...props,
            },
          })),
        }));
        setIsDirty(true);
      },
      moveBlock(blockId, direction) {
        setSchema((currentSchema) => {
          const currentIndex = currentSchema.blocks.findIndex((block) => block.id === blockId);
          const nextIndex = currentIndex + direction;
          if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentSchema.blocks.length) {
            return currentSchema;
          }

          const nextBlocks = [...currentSchema.blocks];
          const [movedBlock] = nextBlocks.splice(currentIndex, 1);
          if (!movedBlock) {
            return currentSchema;
          }

          nextBlocks.splice(nextIndex, 0, movedBlock);
          return {
            ...currentSchema,
            blocks: nextBlocks,
          };
        });
        setIsDirty(true);
      },
      removeBlock(blockId) {
        setSchema((currentSchema) => ({
          ...currentSchema,
          blocks: updateBlockTree(currentSchema.blocks, blockId, () => null),
        }));
        setSelectedBlockId((currentSelectedBlockId) => (currentSelectedBlockId === blockId ? null : currentSelectedBlockId));
        setIsDirty(true);
      },
      setTheme(theme) {
        setSchema((currentSchema) => ({
          ...currentSchema,
          theme: {
            ...currentSchema.theme,
            ...theme,
          },
        }));
        setIsDirty(true);
      },
      replaceSchema(nextSchema) {
        setSchema(nextSchema);
        setSelectedBlockId(nextSchema.blocks[0]?.id ?? null);
        setIsDirty(false);
      },
    },
  };
}

function renderStudio() {
  function Harness() {
    const builder = useStudioBuilder(createPageSchema());

    return (
      <DashboardPreferencesProvider>
        <TemplateBuilderStudio
          builder={builder}
          surfaceLabel="Store home page"
          surfaceCategory="store-page"
          previewContext={{ kind: 'preview' }}
          previewDevice="desktop"
          previewMode="split"
          onPreviewDeviceChange={vi.fn()}
          onPreviewModeChange={vi.fn()}
        />
      </DashboardPreferencesProvider>
    );
  }

  return render(<Harness />);
}

describe('TemplateBuilderStudio', () => {
  it('adds a palette block and updates the selected block content from the inspector', async () => {
    const user = userEvent.setup();
    renderStudio();

    await user.click(screen.getByRole('button', { name: /Rich text/ }));

    expect(screen.getAllByText('Rich text').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByDisplayValue('Tell visitors about your store, products, and latest releases.'),
    ).toBeInTheDocument();

    const contentField = screen.getByLabelText('Content');
    await user.clear(contentField);
    await user.type(contentField, 'A configurable storefront story.');

    expect(screen.getByDisplayValue('A configurable storefront story.')).toBeInTheDocument();
    expect(screen.getByText('A configurable storefront story.')).toBeInTheDocument();
  });

  it('forwards preview device changes from the studio controls', async () => {
    const user = userEvent.setup();
    const onPreviewDeviceChange = vi.fn();

    function Harness() {
      const builder = useStudioBuilder(createPageSchema());

      return (
        <DashboardPreferencesProvider>
          <TemplateBuilderStudio
            builder={builder}
            surfaceLabel="Store home page"
            surfaceCategory="store-page"
            previewContext={{ kind: 'preview' }}
            previewDevice="desktop"
            previewMode="split"
            onPreviewDeviceChange={onPreviewDeviceChange}
            onPreviewModeChange={vi.fn()}
          />
        </DashboardPreferencesProvider>
      );
    }

    render(<Harness />);

    await user.click(screen.getByRole('radio', { name: 'Mobile' }));

    expect(onPreviewDeviceChange).toHaveBeenCalledWith('mobile');
  });
});
