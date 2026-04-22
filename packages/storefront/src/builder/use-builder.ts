/**
 * Purpose: Re-export the shared Framely builder hook for storefront editing flows.
 * Governing docs:
 *   - docs/architecture.md (§5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/builder.test.tsx
 */
export { useBuilder } from '../../../framely-app/src/index';
