/**
 * Purpose: Tests for the block palette definitions.
 * Governing docs:
 *   - AGENTS.md §1.1 (TDD-first)
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  PALETTE_BLOCKS,
  BLOCK_CATEGORIES,
  getBlocksByCategory,
  getPaletteBlock,
} from './block-palette';

describe('block-palette', () => {
  it('has blocks for every category', () => {
    for (const cat of BLOCK_CATEGORIES) {
      const blocks = getBlocksByCategory(cat.key);
      expect(blocks.length).toBeGreaterThan(0);
    }
  });

  it('every block has required fields', () => {
    for (const block of PALETTE_BLOCKS) {
      expect(block.type).toBeTruthy();
      expect(block.label).toBeTruthy();
      expect(block.icon).toBeTruthy();
      expect(block.category).toBeTruthy();
      expect(block.defaultProps).toBeDefined();
      expect(block.propSchema).toBeDefined();
    }
  });

  it('block types are unique', () => {
    const types = PALETTE_BLOCKS.map((b) => b.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('getPaletteBlock returns correct block', () => {
    const block = getPaletteBlock('hero');
    expect(block).toBeDefined();
    expect(block!.label).toBe('Hero Section');
  });

  it('getPaletteBlock returns undefined for unknown type', () => {
    expect(getPaletteBlock('nonexistent')).toBeUndefined();
  });

  it('getBlocksByCategory filters correctly', () => {
    const layout = getBlocksByCategory('layout');
    expect(layout.every((b) => b.category === 'layout')).toBe(true);
  });
});
