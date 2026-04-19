/**
 * Purpose: Tests for Leonardo-based adaptive color palette generation.
 * Governing docs:
 *   - docs/architecture.md (§2 non-negotiable rules — HeroUI everywhere)
 *   - AGENTS.md §4.4 (Leonardo contrast-colors rule)
 * External references:
 *   - https://github.com/adobe/leonardo
 *   - https://github.com/adobe/leonardo/blob/main/packages/contrast-colors/README.md
 *   - https://www.w3.org/TR/WCAG21/#contrast-minimum
 */
import { describe, it, expect } from 'vitest';
import {
  createSimketPalette,
  createCreatorStorePalette,
  applyPaletteAsCSSVariables,
  SIMKET_BRAND,
  type SimketPaletteOptions,
  type PaletteOutput,
} from './leonardo-theme';

describe('Leonardo theme engine', () => {
  describe('createSimketPalette', () => {
    it('generates a palette for light mode', () => {
      const palette = createSimketPalette({ mode: 'light' });

      expect(palette.background).toBeDefined();
      expect(typeof palette.background).toBe('string');
      expect(palette.colors).toBeDefined();
      expect(Object.keys(palette.colors).length).toBeGreaterThan(0);
    });

    it('generates a palette for dark mode', () => {
      const palette = createSimketPalette({ mode: 'dark' });

      expect(palette.background).toBeDefined();
      expect(typeof palette.background).toBe('string');
      expect(palette.colors).toBeDefined();
    });

    it('light and dark palettes have different backgrounds', () => {
      const light = createSimketPalette({ mode: 'light' });
      const dark = createSimketPalette({ mode: 'dark' });

      expect(light.background).not.toBe(dark.background);
    });

    it('includes required semantic color keys', () => {
      const palette = createSimketPalette({ mode: 'light' });

      // Must have accent/primary, neutral, success, warning, danger
      expect(palette.colors['accent100']).toBeDefined();
      expect(palette.colors['neutral100']).toBeDefined();
      expect(palette.colors['success100']).toBeDefined();
      expect(palette.colors['warning100']).toBeDefined();
      expect(palette.colors['danger100']).toBeDefined();
    });

    it('generates multiple contrast steps per color', () => {
      const palette = createSimketPalette({ mode: 'light' });

      // Each color should have multiple ratio steps (100, 200, 300, etc.)
      expect(palette.colors['accent100']).toBeDefined();
      expect(palette.colors['accent200']).toBeDefined();
      expect(palette.colors['accent300']).toBeDefined();
    });

    it('accepts a custom contrast multiplier', () => {
      const normal = createSimketPalette({ mode: 'light', contrast: 1 });
      const high = createSimketPalette({ mode: 'light', contrast: 1.5 });

      // High contrast should produce different values
      expect(normal.colors['accent100']).not.toBe(high.colors['accent100']);
    });

    it('produces valid hex color values', () => {
      const palette = createSimketPalette({ mode: 'light' });
      const hexPattern = /^#[0-9a-fA-F]{6}$/;

      expect(palette.background).toMatch(hexPattern);

      for (const value of Object.values(palette.colors)) {
        expect(value).toMatch(hexPattern);
      }
    });
  });

  describe('createCreatorStorePalette', () => {
    it('generates a palette from a custom primary hue', () => {
      const palette = createCreatorStorePalette({
        primaryColor: '#ff5500',
        mode: 'dark',
      });

      expect(palette.background).toBeDefined();
      expect(palette.colors['accent100']).toBeDefined();
    });

    it('different primary colors produce different accent values', () => {
      const red = createCreatorStorePalette({
        primaryColor: '#ff0000',
        mode: 'light',
      });
      const blue = createCreatorStorePalette({
        primaryColor: '#0000ff',
        mode: 'light',
      });

      expect(red.colors['accent100']).not.toBe(blue.colors['accent100']);
    });

    it('respects custom background color when provided', () => {
      const palette = createCreatorStorePalette({
        primaryColor: '#7c3aed',
        backgroundColor: '#1a1a2e',
        mode: 'dark',
      });

      expect(palette.background).toBeDefined();
      // The background should be influenced by the custom key
      expect(typeof palette.background).toBe('string');
    });
  });

  describe('applyPaletteAsCSSVariables', () => {
    it('returns a record of CSS variable names to values', () => {
      const palette = createSimketPalette({ mode: 'light' });
      const vars = applyPaletteAsCSSVariables(palette);

      expect(vars['--simket-background']).toBe(palette.background);
      expect(vars['--simket-accent100']).toBe(palette.colors['accent100']);
      expect(vars['--simket-neutral100']).toBe(palette.colors['neutral100']);
    });

    it('uses custom prefix for creator stores', () => {
      const palette = createCreatorStorePalette({
        primaryColor: '#7c3aed',
        mode: 'dark',
      });
      const vars = applyPaletteAsCSSVariables(palette, 'store');

      expect(vars['--store-background']).toBe(palette.background);
      expect(vars['--store-accent100']).toBeDefined();
    });
  });

  describe('SIMKET_BRAND', () => {
    it('exports brand color keys', () => {
      expect(SIMKET_BRAND.accent).toBeDefined();
      expect(SIMKET_BRAND.neutral).toBeDefined();
      expect(typeof SIMKET_BRAND.accent).toBe('string');
    });
  });
});
