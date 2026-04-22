/**
 * Purpose: Re-export the storefront builder primitives for creator-store pages.
 * Governing docs:
 *   - docs/architecture.md (§5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/builder.test.tsx
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
export * from './types';
export * from './block-registry';
export * from './renderer';
export * from './use-builder';
export * from './page-defaults';
export * from './blocks/AlertBlock';
export * from './blocks/AvatarBlock';
export * from './blocks/BadgeBlock';
export * from './blocks/BreadcrumbBlock';
export * from './blocks/ModalBlock';
export * from './blocks/ProgressBlock';
export * from './blocks/SkeletonBlock';
export * from './blocks/TableBlock';
export * from './blocks/TabsBlock';
export * from './blocks/TooltipBlock';
export * from './blocks/button-block';
export * from './blocks/card-grid-block';
export * from './blocks/gallery-block';
export * from './blocks/hero-block';
export * from './blocks/product-detail-block';
export * from './blocks/spacer-block';
export * from './blocks/store-catalog-block';
export * from './blocks/store-profile-block';
export * from './blocks/testimonial-block';
export * from './blocks/text-block';
