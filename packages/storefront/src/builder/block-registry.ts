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
import type { BlockComponent, BlockDefinition } from '../../../framely-app/src/index';
import { getBlock, registerBlock } from '../../../framely-app/src/index';
import { AlertBlock, alertBlockDefinition } from './blocks/AlertBlock';
import { AvatarBlock, avatarBlockDefinition } from './blocks/AvatarBlock';
import { BadgeBlock, badgeBlockDefinition } from './blocks/BadgeBlock';
import { BreadcrumbBlock, breadcrumbBlockDefinition } from './blocks/BreadcrumbBlock';
import { ButtonBlock, buttonBlockDefinition } from './blocks/button-block';
import { CardGridBlock, cardGridBlockDefinition } from './blocks/card-grid-block';
import { GalleryBlock, galleryBlockDefinition } from './blocks/gallery-block';
import { HeroBlock, heroBlockDefinition } from './blocks/hero-block';
import { ModalBlock, modalBlockDefinition } from './blocks/ModalBlock';
import { ProductDetailBlock, productDetailBlockDefinition } from './blocks/product-detail-block';
import { ProgressBlock, progressBlockDefinition } from './blocks/ProgressBlock';
import { SkeletonBlock, skeletonBlockDefinition } from './blocks/SkeletonBlock';
import { SpacerBlock, spacerBlockDefinition } from './blocks/spacer-block';
import { StoreCatalogBlock, storeCatalogBlockDefinition } from './blocks/store-catalog-block';
import { StoreProfileBlock, storeProfileBlockDefinition } from './blocks/store-profile-block';
import { TableBlock, tableBlockDefinition } from './blocks/TableBlock';
import { TestimonialBlock, testimonialBlockDefinition } from './blocks/testimonial-block';
import { TextBlock, textBlockDefinition } from './blocks/text-block';
import { TooltipBlock, tooltipBlockDefinition } from './blocks/TooltipBlock';
import { TabsBlock, tabsBlockDefinition } from './blocks/TabsBlock';

export { getAllBlocks, getBlock, registerBlock } from '../../../framely-app/src/index';

function registerDefaultBlock(definition: BlockDefinition, component: BlockComponent): void {
  if (!getBlock(definition.type)) {
    registerBlock(definition, component);
  }
}

function ensureDefaultBlocksRegistered(): void {
  registerDefaultBlock(heroBlockDefinition, HeroBlock as BlockComponent);
  registerDefaultBlock(tabsBlockDefinition, TabsBlock as BlockComponent);
  registerDefaultBlock(tableBlockDefinition, TableBlock as BlockComponent);
  registerDefaultBlock(modalBlockDefinition, ModalBlock as BlockComponent);
  registerDefaultBlock(badgeBlockDefinition, BadgeBlock as BlockComponent);
  registerDefaultBlock(avatarBlockDefinition, AvatarBlock as BlockComponent);
  registerDefaultBlock(progressBlockDefinition, ProgressBlock as BlockComponent);
  registerDefaultBlock(tooltipBlockDefinition, TooltipBlock as BlockComponent);
  registerDefaultBlock(alertBlockDefinition, AlertBlock as BlockComponent);
  registerDefaultBlock(breadcrumbBlockDefinition, BreadcrumbBlock as BlockComponent);
  registerDefaultBlock(skeletonBlockDefinition, SkeletonBlock as BlockComponent);
  registerDefaultBlock(cardGridBlockDefinition, CardGridBlock as BlockComponent);
  registerDefaultBlock(textBlockDefinition, TextBlock as BlockComponent);
  registerDefaultBlock(buttonBlockDefinition, ButtonBlock as BlockComponent);
  registerDefaultBlock(galleryBlockDefinition, GalleryBlock as BlockComponent);
  registerDefaultBlock(spacerBlockDefinition, SpacerBlock as BlockComponent);
  registerDefaultBlock(testimonialBlockDefinition, TestimonialBlock as BlockComponent);
  registerDefaultBlock(productDetailBlockDefinition, ProductDetailBlock as BlockComponent);
  registerDefaultBlock(storeCatalogBlockDefinition, StoreCatalogBlock as BlockComponent);
  registerDefaultBlock(storeProfileBlockDefinition, StoreProfileBlock as BlockComponent);
}

ensureDefaultBlocksRegistered();
