/**
 * Purpose: Provide a shared runtime registry that maps Framely block types to React renderers.
 * Governing docs:
 *   - docs/architecture.md §5 (Framely integration)
 *   - docs/domain-model.md §1 (FramelyProject, EditorElement)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/builder.test.tsx
 */
import type { ComponentType, ReactNode } from 'react';
import type { BlockDefinition, FramelyRenderContext } from './types.js';

export type BlockComponent = ComponentType<
  Record<string, unknown> & {
    readonly children?: ReactNode;
    readonly framelyContext?: FramelyRenderContext;
  }
>;

export interface RegisteredBlock {
  readonly definition: BlockDefinition;
  readonly component: BlockComponent;
}

const registry = new Map<string, RegisteredBlock>();

export function registerBlock(definition: BlockDefinition, component: BlockComponent): void {
  registry.set(definition.type, { definition, component });
}

export function getBlock(type: string): RegisteredBlock | undefined {
  return registry.get(type);
}

export function getAllBlocks(): readonly BlockDefinition[] {
  return Array.from(registry.values()).map((entry) => entry.definition);
}

export function clearRegisteredBlocks(): void {
  registry.clear();
}
