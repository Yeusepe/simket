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

// ---------------------------------------------------------------------------
// Bento spotlight footer (shell frame + gradient anchor)
// ---------------------------------------------------------------------------

/** Leonardo-derived colors for `SpotlightHeroFooter` on a shell-colored bento tile. */
export interface BentoSpotlightFooterColors {
  /** Product / listing line */
  readonly product: string;
  /** Creator / link line */
  readonly creator: string;
  /** CTA pill background */
  readonly ctaBackground: string;
  /** CTA pill label */
  readonly ctaForeground: string;
}

const DEFAULT_SHELL_FALLBACK = '#ddd6fe' as CssColor;

function normalizeShellHex(input: string): CssColor {
  const t = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) {
    return t as CssColor;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    const h = t.slice(1);
    return (`#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`) as CssColor;
  }
  return DEFAULT_SHELL_FALLBACK;
}

/** WCAG relative luminance (sRGB), 0–1. */
function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length !== 6) {
    return 0.5;
  }
  const channel = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(h.slice(0, 2), 16));
  const g = channel(parseInt(h.slice(2, 4), 16));
  const b = channel(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isLightSurface(hex: string): boolean {
  return relativeLuminance(hex) >= 0.45;
}

/** Linear RGB lerp between two #RRGGBB colors (shell is normalized before call). */
function mixHexRgb(a: string, b: string, t: number): string {
  const parse = (hex: string): [number, number, number] | null => {
    const h = hex.replace('#', '');
    if (h.length !== 6) {
      return null;
    }
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const A = parse(a);
  const B = parse(b);
  if (!A || !B) {
    return a;
  }
  const o = A.map((c, i) => Math.round(c + (B[i]! - c) * t)) as [number, number, number];
  return `#${o.map((c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Effective background for contrast math: copy sits on a **gradient over a photo**, not on flat shell.
 * Blend shell toward a dark anchor on light frames (busy imagery reads darker) and toward light on dark frames.
 */
function effectiveSpotlightReadingBackground(shell: string): string {
  if (isLightSurface(shell)) {
    return mixHexRgb(shell, '#0f172a', 0.48);
  }
  return mixHexRgb(shell, '#e2e8f0', 0.36);
}

/**
 * Generate WCAG-aware foreground and CTA colors for the bento spotlight footer
 * using [@adobe/leonardo-contrast-colors](https://github.com/adobe/leonardo) —
 * contrast vs a **reading surface** (shell blended for photo + gradient), then a second pass for the pill label vs the chip.
 *
 * External references:
 * - https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/README.md
 */
const FOOTER_FALLBACK: BentoSpotlightFooterColors = {
  product: '#f8fafc',
  creator: '#e2e8f0',
  ctaBackground: '#ffffff',
  ctaForeground: '#171717',
};

export function createBentoSpotlightFooterColors(shellColor: string): BentoSpotlightFooterColors {
  try {
    const shell = normalizeShellHex(shellColor);
    const shellLight = isLightSurface(shell);
    const readingBg = effectiveSpotlightReadingBackground(shell) as CssColor;

    const shellBg = new BackgroundColor({
      name: 'shell',
      colorKeys: [readingBg],
      ratios: [1],
      colorSpace: 'LAB',
    });

    const ink = new Color({
      name: 'ink',
      colorKeys: ['#0f172a', '#f8fafc', '#64748b'] as CssColor[],
      // Slightly higher targets — real backdrop is noisier than flat hex.
      ratios: { product: 5.5, creator: 4 },
      colorSpace: 'LAB',
    });

    const pillSurfaceRatio = shellLight ? -2 : 5;
    const pill = new Color({
      name: 'pill',
      colorKeys: ['#ffffff', '#f1f5f9', '#1e293b'] as CssColor[],
      ratios: { surface: pillSurfaceRatio },
      colorSpace: 'LAB',
    });

    const lightness = shellLight ? 92 : 18;

    const theme1 = new Theme({
      colors: [shellBg, ink, pill],
      backgroundColor: shellBg,
      lightness,
      contrast: 1,
      saturation: 100,
      output: 'HEX',
    });

    const p1 = theme1.contrastColorPairs as Record<string, string>;
    const product = p1.product;
    const creator = p1.creator;
    const surface = p1.surface;

    const onCta = new Color({
      name: 'onCta',
      colorKeys: ['#fafafa', '#f1f5f9', '#171717'] as CssColor[],
      ratios: { ctaLabel: 7 },
      colorSpace: 'LAB',
    });

    const theme2 = new Theme({
      colors: [onCta],
      backgroundColor: surface as CssColor,
      lightness: 100,
      contrast: 1,
      saturation: 100,
      output: 'HEX',
    });

    const p2 = theme2.contrastColorPairs as Record<string, string>;
    const ctaForeground = p2.ctaLabel;

    if (
      typeof product !== 'string' ||
      typeof creator !== 'string' ||
      typeof surface !== 'string' ||
      typeof ctaForeground !== 'string'
    ) {
      return FOOTER_FALLBACK;
    }

    return {
      product,
      creator,
      ctaBackground: surface,
      ctaForeground,
    };
  } catch {
    return FOOTER_FALLBACK;
  }
}
