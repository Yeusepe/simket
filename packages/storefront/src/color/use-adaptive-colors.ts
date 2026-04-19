/**
 * Purpose: React hook that generates and applies an adaptive Leonardo color
 * palette as CSS custom properties, reacting to light/dark mode changes.
 *
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §14 color system)
 *   - AGENTS.md §4.4 (Leonardo contrast-colors rule)
 * External references:
 *   - https://github.com/adobe/leonardo
 *   - https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/README.md
 * Tests:
 *   - packages/storefront/src/color/use-adaptive-colors.test.ts
 */
import { useEffect, useMemo } from 'react';
import {
  createSimketPalette,
  createCreatorStorePalette,
  applyPaletteAsCSSVariables,
  type PaletteOutput,
} from './leonardo-theme';

export interface UseAdaptiveColorsOptions {
  /** Current mode from useTheme() */
  mode: 'light' | 'dark';
  /** Optional contrast multiplier (1 = normal, >1 = higher contrast). */
  contrast?: number;
  /** If set, generates a creator-store palette using this primary color. */
  primaryColor?: string;
  /** Optional custom background key for creator stores. */
  backgroundColor?: string;
  /** CSS variable prefix. Defaults to 'simket'. */
  prefix?: string;
}

/**
 * Generates an adaptive Leonardo palette for the current mode and applies
 * it as CSS custom properties on `document.documentElement`.
 *
 * Returns the raw palette output for direct usage in components.
 */
export function useAdaptiveColors(options: UseAdaptiveColorsOptions): PaletteOutput {
  const {
    mode,
    contrast = 1,
    primaryColor,
    backgroundColor,
    prefix = 'simket',
  } = options;

  const palette = useMemo(() => {
    if (primaryColor) {
      return createCreatorStorePalette({
        primaryColor,
        backgroundColor,
        mode,
        contrast,
      });
    }

    return createSimketPalette({ mode, contrast });
  }, [mode, contrast, primaryColor, backgroundColor]);

  useEffect(() => {
    const vars = applyPaletteAsCSSVariables(palette, prefix);
    const root = document.documentElement;

    for (const [prop, value] of Object.entries(vars)) {
      root.style.setProperty(prop, value);
    }

    return () => {
      for (const prop of Object.keys(vars)) {
        root.style.removeProperty(prop);
      }
    };
  }, [palette, prefix]);

  return palette;
}
