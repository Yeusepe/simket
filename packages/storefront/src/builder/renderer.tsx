/**
 * Purpose: Re-export the shared Framely page renderer for storefront page composition.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import './block-registry';

export { PageRenderer } from '../../../framely-app/src/index';
