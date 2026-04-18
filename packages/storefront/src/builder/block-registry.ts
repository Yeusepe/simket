/**
 * Purpose: Provide a central registry that maps JSON schema block types to HeroUI-backed React components.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 *   - https://dev.to/belastrittmatter/building-a-nextjs-website-editor-bj3
 * Tests:
 *   - packages/storefront/src/builder/builder.test.tsx
 */
import type { ComponentType, ReactNode } from 'react';
import type { BlockDefinition } from './types';
import { AlertBlock, alertBlockDefinition } from './blocks/AlertBlock';
import { AvatarBlock, avatarBlockDefinition } from './blocks/AvatarBlock';
import { BadgeBlock, badgeBlockDefinition } from './blocks/BadgeBlock';
import { BreadcrumbBlock, breadcrumbBlockDefinition } from './blocks/BreadcrumbBlock';
import { ButtonBlock, buttonBlockDefinition } from './blocks/button-block';
import { CardGridBlock, cardGridBlockDefinition } from './blocks/card-grid-block';
import { GalleryBlock, galleryBlockDefinition } from './blocks/gallery-block';
import { HeroBlock, heroBlockDefinition } from './blocks/hero-block';
import { ModalBlock, modalBlockDefinition } from './blocks/ModalBlock';
import { ProgressBlock, progressBlockDefinition } from './blocks/ProgressBlock';
import { SkeletonBlock, skeletonBlockDefinition } from './blocks/SkeletonBlock';
import { SpacerBlock, spacerBlockDefinition } from './blocks/spacer-block';
import { TableBlock, tableBlockDefinition } from './blocks/TableBlock';
import { TestimonialBlock, testimonialBlockDefinition } from './blocks/testimonial-block';
import { TextBlock, textBlockDefinition } from './blocks/text-block';
import { TooltipBlock, tooltipBlockDefinition } from './blocks/TooltipBlock';
import { TabsBlock, tabsBlockDefinition } from './blocks/TabsBlock';

export type BlockComponent = ComponentType<Record<string, unknown> & { children?: ReactNode }>;

export interface RegisteredBlock {
  readonly definition: BlockDefinition;
  readonly component: BlockComponent;
}

const registry = new Map<string, RegisteredBlock>();

export function registerBlock(
  definition: BlockDefinition,
  component: BlockComponent,
): void {
  registry.set(definition.type, { definition, component });
}

export function getBlock(type: string): RegisteredBlock | undefined {
  return registry.get(type);
}

export function getAllBlocks(): readonly BlockDefinition[] {
  return Array.from(registry.values()).map((entry) => entry.definition);
}

function ensureDefaultBlocksRegistered(): void {
  if (registry.size > 0) {
    return;
  }

  registerBlock(heroBlockDefinition, HeroBlock as BlockComponent);
  registerBlock(tabsBlockDefinition, TabsBlock as BlockComponent);
  registerBlock(tableBlockDefinition, TableBlock as BlockComponent);
  registerBlock(modalBlockDefinition, ModalBlock as BlockComponent);
  registerBlock(badgeBlockDefinition, BadgeBlock as BlockComponent);
  registerBlock(avatarBlockDefinition, AvatarBlock as BlockComponent);
  registerBlock(progressBlockDefinition, ProgressBlock as BlockComponent);
  registerBlock(tooltipBlockDefinition, TooltipBlock as BlockComponent);
  registerBlock(alertBlockDefinition, AlertBlock as BlockComponent);
  registerBlock(breadcrumbBlockDefinition, BreadcrumbBlock as BlockComponent);
  registerBlock(skeletonBlockDefinition, SkeletonBlock as BlockComponent);
  registerBlock(cardGridBlockDefinition, CardGridBlock as BlockComponent);
  registerBlock(textBlockDefinition, TextBlock as BlockComponent);
  registerBlock(buttonBlockDefinition, ButtonBlock as BlockComponent);
  registerBlock(galleryBlockDefinition, GalleryBlock as BlockComponent);
  registerBlock(spacerBlockDefinition, SpacerBlock as BlockComponent);
  registerBlock(testimonialBlockDefinition, TestimonialBlock as BlockComponent);
}

ensureDefaultBlocksRegistered();
