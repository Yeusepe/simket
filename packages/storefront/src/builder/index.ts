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
export * from './blocks/button-block';
export * from './blocks/card-grid-block';
export * from './blocks/gallery-block';
export * from './blocks/hero-block';
export * from './blocks/spacer-block';
export * from './blocks/testimonial-block';
export * from './blocks/text-block';
