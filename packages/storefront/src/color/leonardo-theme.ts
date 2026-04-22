/**
 * Purpose: Adaptive color palette engine built on Adobe Leonardo.
 * Generates WCAG-compliant semantic color tokens for the marketplace
 * (light/dark) and for per-creator-store theming. Each token has a clear
 * purpose (fg = primary text, muted-fg = secondary text, border, accent, etc.)
 * and every surface color is paired with a readable foreground.
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

// ─── Brand key colors ────────────────────────────────────────────────────────

export const SIMKET_BRAND = {
  accent: '#7C3AED' as CssColor,
  neutral: '#8B8B8B' as CssColor,
  success: '#22C55E' as CssColor,
  warning: '#F59E0B' as CssColor,
  danger: '#EF4444' as CssColor,
} as const;

// ─── Semantic token catalog (single source of truth) ─────────────────────────

/**
 * Every token name the palette produces. Tests iterate this list to verify
 * completeness, and `applyPaletteAsCSSVariables` maps them 1:1 to CSS vars.
 *
 * Naming convention:
 *   plain name   → surface / UI element color (contrast against page bg)
 *   -bold suffix → stronger shade safe for text on page bg (WCAG AA)
 *   -fg suffix   → best-contrast foreground ON that surface (black or white)
 */
export const SEMANTIC_TOKENS = [
  // Neutral scale (contrast against page background)
  'subtle',       // 1.5:1 — hover backgrounds, subtle dividers
  'border',       // 3:1   — borders, input outlines (WCAG AA UI components)
  'muted-fg',     // 7:1   — secondary / caption text (WCAG AAA)
  'fg',           // 14:1  — primary body text (near-white on dark, near-black on light)
  'strong-fg',    // 17:1  — headings, maximum emphasis

  // Accent scale (contrast against page background)
  'accent-subtle', // 1.5:1 — faint accent tint for section backgrounds
  'accent',        // 3:1   — accent icons, badges, UI elements
  'accent-bold',   // 4.5:1 — accent text on page background
  'accent-fg',     // readable foreground ON accent surface

  // Status: success
  'success-subtle', 'success', 'success-bold', 'success-fg',
  // Status: warning
  'warning-subtle', 'warning', 'warning-bold', 'warning-fg',
  // Status: danger
  'danger-subtle', 'danger', 'danger-bold', 'danger-fg',
] as const;

export type SemanticToken = (typeof SEMANTIC_TOKENS)[number];

// ─── Ratio definitions ───────────────────────────────────────────────────────

const LIGHTNESS_LIGHT = 97;
const LIGHTNESS_DARK = 11;

/** Named ratios for the neutral scale. Leonardo's RatiosObject yields named output keys. */
const NEUTRAL_RATIOS: Record<string, number> = {
  'subtle': 1.5,
  'border': 3,
  'muted-fg': 7,
  'fg': 14,
  'strong-fg': 17,
};

/** Generate named ratios for a semantic color channel (accent, success, etc.). */
function channelRatios(prefix: string): Record<string, number> {
  return {
    [`${prefix}-subtle`]: 1.5,
    [prefix]: 3,
    [`${prefix}-bold`]: 4.5,
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── WCAG utilities (pure math) ──────────────────────────────────────────────

const HEX_FALLBACK = '#ddd6fe' as CssColor;

function normalizeHex(input: string): string {
  const t = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t;
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    const h = t.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return HEX_FALLBACK;
}

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length !== 6) return 0.5;
  const ch = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * ch(parseInt(h.slice(0, 2), 16)) +
    0.7152 * ch(parseInt(h.slice(2, 4), 16)) +
    0.0722 * ch(parseInt(h.slice(4, 6), 16))
  );
}

function isLightSurface(hex: string): boolean {
  return relativeLuminance(hex) >= 0.45;
}

export function wcagContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = relativeLuminance(normalizeHex(foregroundHex));
  const l2 = relativeLuminance(normalizeHex(backgroundHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function preferLightForegroundOnBackground(backgroundHex: string): boolean {
  const bg = normalizeHex(backgroundHex);
  return wcagContrastRatio('#ffffff', bg) > wcagContrastRatio('#000000', bg);
}

export function foregroundAnchorForBackground(backgroundHex: string): CssColor {
  return (preferLightForegroundOnBackground(backgroundHex) ? '#ffffff' : '#000000') as CssColor;
}

export function approximateSrgbSaturation(backgroundHex: string): number {
  const h = normalizeHex(backgroundHex).replace('#', '');
  if (h.length !== 6) return 0;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  if (max <= 0) return 0;
  return (max - Math.min(r, g, b)) / max;
}

function approximateHueDegrees(backgroundHex: string): number | null {
  const h = normalizeHex(backgroundHex).replace('#', '');
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;

  const hue = max === r
    ? ((g - b) / delta) % 6
    : max === g
      ? (b - r) / delta + 2
      : (r - g) / delta + 4;

  const degrees = hue * 60;
  return degrees < 0 ? degrees + 360 : degrees;
}

function mixHexRgb(a: string, b: string, t: number): string {
  const parse = (hex: string): [number, number, number] | null => {
    const h = hex.replace('#', '');
    if (h.length !== 6) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const A = parse(a);
  const B = parse(b);
  if (!A || !B) return a;
  const o = A.map((c, i) => Math.round(c + (B[i]! - c) * t)) as [number, number, number];
  return `#${o.map(c => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0')).join('')}`;
}

/** Nudge fg toward black/white until minRatio is met (binary search, preserves hue). */
function ensureReadable(fg: string, bg: string, minRatio: number): string {
  const fgN = normalizeHex(fg);
  const bgN = normalizeHex(bg);
  if (wcagContrastRatio(fgN, bgN) >= minRatio) return fgN;
  const anchor = foregroundAnchorForBackground(bgN);
  if (wcagContrastRatio(anchor, bgN) < minRatio) return anchor;
  let lo = 0;
  let hi = 1;
  let best = mixHexRgb(fgN, anchor, 1);
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const mixed = mixHexRgb(fgN, anchor, mid);
    if (wcagContrastRatio(mixed, bgN) >= minRatio) {
      best = mixed;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

function ensureBackgroundSupports(fg: string, bg: string, minRatio: number, anchor: string): string {
  const fgN = normalizeHex(fg);
  const bgN = normalizeHex(bg);
  const anchorN = normalizeHex(anchor);
  if (wcagContrastRatio(fgN, bgN) >= minRatio) return bgN;
  if (wcagContrastRatio(fgN, anchorN) < minRatio) return anchorN;

  let lo = 0;
  let hi = 1;
  let best = anchorN;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const mixed = mixHexRgb(bgN, anchorN, mid);
    if (wcagContrastRatio(fgN, mixed) >= minRatio) {
      best = mixed;
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return best;
}

function deriveHuePreservingReadingSurface(
  shell: string,
  options?: {
    readonly baseDarken?: number;
    readonly maxDarken?: number;
  },
): string {
  const baseDarken = options?.baseDarken ?? 0.18;
  const maxDarken = options?.maxDarken ?? 0.62;
  const start = mixHexRgb(shell, '#000000', baseDarken);
  const anchor = mixHexRgb(shell, '#000000', maxDarken);
  return ensureBackgroundSupports('#f8fafc', start, WCAG_AA, anchor);
}

// ─── Core palette builder ────────────────────────────────────────────────────

function buildPalette(
  accentKey: CssColor,
  bgKey: CssColor,
  mode: 'light' | 'dark',
  contrastMultiplier: number,
): PaletteOutput {
  const bg = new BackgroundColor({
    name: 'neutral',
    colorKeys: [bgKey],
    ratios: NEUTRAL_RATIOS,
    colorSpace: 'LAB',
  });

  const accent = new Color({
    name: 'accent',
    colorKeys: [accentKey],
    ratios: channelRatios('accent'),
    colorSpace: 'LAB',
  });

  const success = new Color({
    name: 'success',
    colorKeys: [SIMKET_BRAND.success],
    ratios: channelRatios('success'),
    colorSpace: 'LAB',
  });

  const warning = new Color({
    name: 'warning',
    colorKeys: [SIMKET_BRAND.warning],
    ratios: channelRatios('warning'),
    colorSpace: 'LAB',
  });

  const danger = new Color({
    name: 'danger',
    colorKeys: [SIMKET_BRAND.danger],
    ratios: channelRatios('danger'),
    colorSpace: 'LAB',
  });

  const theme = new Theme({
    colors: [bg, accent, success, warning, danger],
    backgroundColor: bg,
    lightness: mode === 'light' ? LIGHTNESS_LIGHT : LIGHTNESS_DARK,
    contrast: contrastMultiplier,
    saturation: 100,
    output: 'HEX',
  });

  const pairs = theme.contrastColorPairs as Record<string, string>;
  const background = theme.contrastColors[0].background;

  // Filter out the 'background' key that Leonardo includes in contrastColorPairs
  // — we expose it separately via palette.background
  const { background: _bg, ...colorPairs } = pairs;

  // Compute on-surface foregrounds via WCAG math (not Leonardo)
  const onSurface: Record<string, string> = {};
  for (const channel of ['accent', 'success', 'warning', 'danger'] as const) {
    const surface = colorPairs[channel];
    if (surface) {
      onSurface[`${channel}-fg`] = foregroundAnchorForBackground(surface);
    }
  }

  return {
    background,
    colors: { ...colorPairs, ...onSurface },
  };
}

// ─── Public palette API ──────────────────────────────────────────────────────

export function createSimketPalette(options: SimketPaletteOptions): PaletteOutput {
  return buildPalette(
    SIMKET_BRAND.accent,
    SIMKET_BRAND.neutral,
    options.mode,
    options.contrast ?? 1,
  );
}

export function createCreatorStorePalette(options: CreatorStorePaletteOptions): PaletteOutput {
  return buildPalette(
    options.primaryColor as CssColor,
    (options.backgroundColor ?? SIMKET_BRAND.neutral) as CssColor,
    options.mode,
    options.contrast ?? 1,
  );
}

/**
 * Map a PaletteOutput to CSS custom properties: `--{prefix}-bg`, `--{prefix}-fg`, etc.
 * Also bridges Leonardo tokens → HeroUI theme variables so that HeroUI utilities
 * (text-foreground, bg-background, text-default-foreground, etc.) pick up Leonardo colors.
 */
export function applyPaletteAsCSSVariables(
  palette: PaletteOutput,
  prefix = 'simket',
): Record<string, string> {
  const vars: Record<string, string> = {
    [`--${prefix}-bg`]: palette.background,
  };
  for (const [key, value] of Object.entries(palette.colors)) {
    vars[`--${prefix}-${key}`] = value;
  }

  // Bridge Leonardo → HeroUI theme variables.
  // HeroUI v3 reads --foreground, --background, --muted, --border, --surface,
  // --default-foreground from :root. Setting them here makes every HeroUI utility
  // (text-foreground, bg-surface, etc.) consistent with our Leonardo palette.
  vars['--foreground'] = palette.colors['fg'] ?? '';
  vars['--background'] = palette.background;
  vars['--muted'] = palette.colors['muted-fg'] ?? '';
  vars['--border'] = palette.colors['border'] ?? '';
  vars['--surface'] = palette.colors['subtle'] ?? palette.background;
  vars['--surface-foreground'] = palette.colors['fg'] ?? '';
  vars['--default-foreground'] = palette.colors['fg'] ?? '';
  vars['--overlay-foreground'] = palette.colors['fg'] ?? '';
  vars['--field-foreground'] = palette.colors['fg'] ?? '';
  vars['--field-placeholder'] = palette.colors['muted-fg'] ?? '';

  return vars;
}

// ─── Bento spotlight utilities ───────────────────────────────────────────────

export interface BentoSpotlightFooterColors {
  readonly surface: string;
  readonly product: string;
  readonly creator: string;
  readonly ctaBackground: string;
  readonly ctaForeground: string;
}

export type BentoSpotlightContrastSurface = 'photoOverlay' | 'solidShell';

export interface CreateBentoSpotlightFooterColorsOptions {
  readonly contrastSurface?: BentoSpotlightContrastSurface;
}

const FOOTER_FALLBACK: BentoSpotlightFooterColors = {
  surface: '#1e293b',
  product: '#f8fafc',
  creator: '#e2e8f0',
  ctaBackground: '#ffffff',
  ctaForeground: '#171717',
};

const WCAG_AA = 4.5;

function effectiveReadingBackground(shell: string): string {
  const baseDarken = isLightSurface(shell) ? 0.3 : 0.2;
  const maxDarken = isLightSurface(shell) ? 0.72 : 0.62;
  return deriveHuePreservingReadingSurface(shell, { baseDarken, maxDarken });
}

export function getBentoSpotlightReadingBackground(
  shellColor: string,
  options?: CreateBentoSpotlightFooterColorsOptions,
): string {
  const shell = normalizeHex(shellColor);
  if ((options?.contrastSurface ?? 'photoOverlay') === 'solidShell') {
    const saturation = approximateSrgbSaturation(shell);
    const hue = approximateHueDegrees(shell);
    const luminance = relativeLuminance(shell);
    const isVioletFamily =
      hue !== null &&
      hue >= 235 &&
      hue <= 320 &&
      saturation >= 0.45 &&
      luminance >= 0.08 &&
      luminance <= 0.4;

    return isVioletFamily
      ? deriveHuePreservingReadingSurface(shell, { baseDarken: 0.08, maxDarken: 0.46 })
      : shell;
  }
  return effectiveReadingBackground(shell);
}

export function shellHarmonyDividerColor(shellColor: string): string {
  try {
    const shell = normalizeHex(shellColor);
    return isLightSurface(shell)
      ? mixHexRgb(shell, '#0f172a', 0.22)
      : mixHexRgb(shell, '#f8fafc', 0.28);
  } catch {
    return 'color-mix(in srgb, currentColor 18%, transparent)';
  }
}

export function createBentoSpotlightFooterColors(
  shellColor: string,
  options?: CreateBentoSpotlightFooterColorsOptions,
): BentoSpotlightFooterColors {
  try {
    const shell = normalizeHex(shellColor);
    const surface = getBentoSpotlightReadingBackground(shell, options);
    const useLightText = preferLightForegroundOnBackground(surface);

    // Spotlight cards read against a derived surface, not the raw shell, so
    // saturated violet shells can still use crisp light text.
    const product = useLightText ? '#f8fafc' : '#171717';
    const creator = useLightText
      ? ensureReadable('#94a3b8', surface, WCAG_AA)
      : ensureReadable('#475569', surface, WCAG_AA);

    const ctaBackground = deriveHuePreservingReadingSurface(surface, {
      baseDarken: isLightSurface(surface) ? 0.3 : 0.18,
      maxDarken: isLightSurface(surface) ? 0.74 : 0.6,
    });
    const ctaForeground = ensureReadable('#f8fafc', ctaBackground, WCAG_AA);

    return { surface, product, creator, ctaBackground, ctaForeground };
  } catch {
    return FOOTER_FALLBACK;
  }
}
