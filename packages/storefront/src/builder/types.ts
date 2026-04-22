/**
 * Purpose: Re-export the shared Framely page schema contracts for the storefront builder.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/builder.test.tsx
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
export {
  CURRENT_PAGE_SCHEMA_VERSION,
  createPageSchema,
  validatePageSchema,
  type BlockDefinition,
  type FramelyRenderContext,
  type PageBlock,
  type PageSchema,
  type PageSchemaValidationResult,
  type PropField,
  type PropSchema,
  type ThemeOverrides,
} from '../../../framely-app/src/index';
