/**
 * Purpose: Adaptive color palette engine built on Adobe Leonardo.
 * Generates WCAG-compliant contrast-based color palettes for the marketplace
 * (light/dark) and for per-creator-store theming.
 *
 * Governing docs:
 *   - docs/architecture.md (§2 non-negotiable rules — HeroUI everywhere, §14 color system)
 *   - AGENTS.md §4.4 (Leonardo contrast-colors rule)
 * External references:
 *   - https://github.com/adobe/leonardo
 *   - https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/README.md
 *   - https://www.w3.org/TR/WCAG21/#contrast-minimum
 *   - https://leonardocolor.io/
 * Tests:
 *   - packages/storefront/src/color/leonardo-theme.test.ts
 */
import {
  Theme,
  Color,
  BackgroundColor,
  type CssColor,
} from '@adobe/leonardo-contrast-colors';

// ---------------------------------------------------------------------------
// Brand key colors
// ---------------------------------------------------------------------------

export const SIMKET_BRAND = {
  /** Simket purple — primary accent */
  accent: '#7C3AED' as CssColor,
  /** Neutral gray scale key */
  neutral: '#8B8B8B' as CssColor,
  /** Success green */
  success: '#22C55E' as CssColor,
  /** Warning amber */
  warning: '#F59E0B' as CssColor,
  /** Danger red */
  danger: '#EF4444' as CssColor,
} as const;

/** Lightness value for light mode background (0-100). */
const LIGHTNESS_LIGHT = 97;
/** Lightness value for dark mode background (0-100). */
const LIGHTNESS_DARK = 11;

/**
 * Contrast ratios for each semantic color. These target WCAG 2.1 AA minimums
 * for text (4.5:1) and large text/UI components (3:1), plus decorative stops.
 *
 * Docs: https://www.w3.org/TR/WCAG21/#contrast-minimum
 */
const SEMANTIC_RATIOS = [1.25, 2, 3, 4.5, 7, 10];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimketPaletteOptions {
  mode: 'light' | 'dark';
  contrast?: number;
}

export interface CreatorStorePaletteOptions {
  primaryColor: string;
  backgroundColor?: string;
  mode: 'light' | 'dark';
  contrast?: number;
}

export interface PaletteOutput {
  background: string;
  colors: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildTheme(
  accentKey: CssColor,
  neutralKey: CssColor,
  bgKey: CssColor,
  mode: 'light' | 'dark',
  contrastMultiplier: number,
): Theme {
  const bg = new BackgroundColor({
    name: 'neutral',
    colorKeys: [bgKey],
    ratios: SEMANTIC_RATIOS,
    colorSpace: 'LAB',
  });

  const accent = new Color({
    name: 'accent',
    colorKeys: [accentKey],
    ratios: SEMANTIC_RATIOS,
    colorSpace: 'LAB',
  });

  const success = new Color({
    name: 'success',
    colorKeys: [SIMKET_BRAND.success],
    ratios: SEMANTIC_RATIOS,
    colorSpace: 'LAB',
  });

  const warning = new Color({
    name: 'warning',
    colorKeys: [SIMKET_BRAND.warning],
    ratios: SEMANTIC_RATIOS,
    colorSpace: 'LAB',
  });

  const danger = new Color({
    name: 'danger',
    colorKeys: [SIMKET_BRAND.danger],
    ratios: SEMANTIC_RATIOS,
    colorSpace: 'LAB',
  });

  return new Theme({
    colors: [bg, accent, success, warning, danger],
    backgroundColor: bg,
    lightness: mode === 'light' ? LIGHTNESS_LIGHT : LIGHTNESS_DARK,
    contrast: contrastMultiplier,
    saturation: 100,
    output: 'HEX',
  });
}

function themeToPaletteOutput(theme: Theme): PaletteOutput {
  const pairs = theme.contrastColorPairs;
  const contrastColors = theme.contrastColors;
  const background = contrastColors[0].background;

  return {
    background,
    colors: { ...pairs },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate the marketplace-wide Simket palette for light or dark mode.
 * Uses the Simket brand accent (#7C3AED) and a neutral gray background.
 * All color values meet WCAG 2.1 AA contrast requirements against the
 * generated background.
 */
export function createSimketPalette(options: SimketPaletteOptions): PaletteOutput {
  const theme = buildTheme(
    SIMKET_BRAND.accent,
    SIMKET_BRAND.neutral,
    SIMKET_BRAND.neutral,
    options.mode,
    options.contrast ?? 1,
  );

  return themeToPaletteOutput(theme);
}

/**
 * Generate an adaptive palette for a creator store. The creator picks a
 * primary (accent) color; Leonardo generates the full scale with guaranteed
 * contrast against the computed background. Optionally, a custom background
 * color key can be provided.
 */
export function createCreatorStorePalette(
  options: CreatorStorePaletteOptions,
): PaletteOutput {
  const theme = buildTheme(
    options.primaryColor as CssColor,
    SIMKET_BRAND.neutral,
    (options.backgroundColor ?? SIMKET_BRAND.neutral) as CssColor,
    options.mode,
    options.contrast ?? 1,
  );

  return themeToPaletteOutput(theme);
}

/**
 * Convert a PaletteOutput into a flat Record of CSS custom property names
 * to hex values. Useful for setting `document.documentElement.style`.
 *
 * @param palette  The palette from createSimketPalette or createCreatorStorePalette
 * @param prefix   CSS variable prefix (default "simket"). E.g. "store" → `--store-accent100`
 */
export function applyPaletteAsCSSVariables(
  palette: PaletteOutput,
  prefix = 'simket',
): Record<string, string> {
  const vars: Record<string, string> = {
    [`--${prefix}-background`]: palette.background,
  };

  for (const [key, value] of Object.entries(palette.colors)) {
    vars[`--${prefix}-${key}`] = value;
  }

  return vars;
}
