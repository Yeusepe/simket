/**
 * Purpose: Public API for the Leonardo-based adaptive color system.
 * Governing docs:
 *   - docs/architecture.md (§14 color system)
 *   - AGENTS.md §4.4 (Leonardo contrast-colors rule)
 * External references:
 *   - https://github.com/adobe/leonardo
 * Tests:
 *   - packages/storefront/src/color/leonardo-theme.test.ts
 *   - packages/storefront/src/color/use-adaptive-colors.test.ts
 */
export {
  createSimketPalette,
  createCreatorStorePalette,
  applyPaletteAsCSSVariables,
  SIMKET_BRAND,
  type SimketPaletteOptions,
  type CreatorStorePaletteOptions,
  type PaletteOutput,
} from './leonardo-theme';

export { useAdaptiveColors } from './use-adaptive-colors';
