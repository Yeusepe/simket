/**
 * Purpose: Manage editable creator-store page schemas with selection, ordering, and theme updates.
 * Governing docs:
 *   - docs/architecture.md (§5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§6 state and data rules)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 *   - https://dev.to/belastrittmatter/building-a-nextjs-website-editor-bj3
 * Tests:
 *   - packages/storefront/src/builder/builder.test.tsx
 */
import { useMemo, useState } from 'react';
import { getBlock } from './block-registry';
import { createPageSchema, type PageBlock, type PageSchema, type ThemeOverrides } from './types';

function createBlockId(type: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${type}-${crypto.randomUUID()}`;
  }

  return `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function findBlock(blocks: readonly PageBlock[], id: string): PageBlock | undefined {
  for (const block of blocks) {
    if (block.id === id) {
      return block;
    }

    if (block.children) {
      const nestedBlock = findBlock(block.children, id);
      if (nestedBlock) {
        return nestedBlock;
      }
    }
  }

  return undefined;
}

function insertBlock(
  blocks: readonly PageBlock[],
  newBlock: PageBlock,
  parentId?: string,
): readonly PageBlock[] {
  if (!parentId) {
    return [...blocks, newBlock];
  }

  return blocks.map((block) => {
    if (block.id === parentId) {
      return {
        ...block,
        children: [...(block.children ?? []), newBlock],
      };
    }

    if (!block.children) {
      return block;
    }

    return {
      ...block,
      children: insertBlock(block.children, newBlock, parentId),
    };
  });
}

function updateBlock(
  blocks: readonly PageBlock[],
  id: string,
  update: (block: PageBlock) => PageBlock,
): readonly PageBlock[] {
  return blocks.map((block) => {
    if (block.id === id) {
      return update(block);
    }

    if (!block.children) {
      return block;
    }

    return {
      ...block,
      children: updateBlock(block.children, id, update),
    };
  });
}

function removeBlock(
  blocks: readonly PageBlock[],
  id: string,
): readonly PageBlock[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) =>
      block.children
        ? {
            ...block,
            children: removeBlock(block.children, id),
          }
        : block,
    );
}

function moveBlock(
  blocks: readonly PageBlock[],
  id: string,
  offset: number,
): readonly PageBlock[] {
  const currentIndex = blocks.findIndex((block) => block.id === id);

  if (currentIndex >= 0) {
    const nextIndex = currentIndex + offset;

    if (nextIndex < 0 || nextIndex >= blocks.length) {
      return blocks;
    }

    const reorderedBlocks = [...blocks];
    const [movedBlock] = reorderedBlocks.splice(currentIndex, 1);

    reorderedBlocks.splice(nextIndex, 0, movedBlock!);
    return reorderedBlocks;
  }

  return blocks.map((block) =>
    block.children
      ? {
          ...block,
          children: moveBlock(block.children, id, offset),
        }
      : block,
  );
}

function findFirstBlock(blocks: readonly PageBlock[]): PageBlock | undefined {
  return blocks[0];
}

export function useBuilder(initialSchema?: PageSchema) {
  const [schema, setSchema] = useState<PageSchema>(() =>
    createPageSchema(initialSchema),
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const selectedBlock = useMemo(
    () => (selectedBlockId ? findBlock(schema.blocks, selectedBlockId) : null),
    [schema.blocks, selectedBlockId],
  );

  const actions = useMemo(
    () => ({
      addBlock(type: string, parentId?: string) {
        const registeredBlock = getBlock(type);

        if (!registeredBlock) {
          throw new Error(`Unknown block type: ${type}`);
        }

        const newBlock: PageBlock = {
          id: createBlockId(type),
          type,
          props: { ...registeredBlock.definition.defaultProps },
        };

        setSchema((currentSchema) => ({
          ...currentSchema,
          blocks: insertBlock(currentSchema.blocks, newBlock, parentId),
        }));
        setSelectedBlockId(newBlock.id);
        setIsDirty(true);
      },
      removeBlock(id: string) {
        setSchema((currentSchema) => {
          const nextBlocks = removeBlock(currentSchema.blocks, id);
          const nextSelectedBlock = findBlock(nextBlocks, selectedBlockId ?? '') ?? findFirstBlock(nextBlocks);
          setSelectedBlockId(nextSelectedBlock?.id ?? null);
          return {
            ...currentSchema,
            blocks: nextBlocks,
          };
        });
        setIsDirty(true);
      },
      moveBlock(id: string, offset: number) {
        setSchema((currentSchema) => ({
          ...currentSchema,
          blocks: moveBlock(currentSchema.blocks, id, offset),
        }));
        setIsDirty(true);
      },
      updateBlockProps(id: string, props: Record<string, unknown>) {
        setSchema((currentSchema) => ({
          ...currentSchema,
          blocks: updateBlock(currentSchema.blocks, id, (block) => ({
            ...block,
            props: {
              ...block.props,
              ...props,
            },
          })),
        }));
        setSelectedBlockId(id);
        setIsDirty(true);
      },
      setTheme(theme: ThemeOverrides) {
        setSchema((currentSchema) => ({
          ...currentSchema,
          theme: {
            ...(currentSchema.theme ?? {}),
            ...theme,
          },
        }));
        setIsDirty(true);
      },
      selectBlock(id: string | null) {
        setSelectedBlockId(id);
      },
    }),
    [selectedBlockId],
  );

  return {
    schema,
    selectedBlock,
    selectedBlockId,
    isDirty,
    actions,
  } as const;
}
