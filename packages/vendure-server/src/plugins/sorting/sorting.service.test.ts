/**
 * Purpose: Tests for SortingService — user-configurable sorting for recommended products.
 *
 * Governing docs:
 *   - docs/architecture.md §9 (Recommendations)
 * Tests:
 *   - This file
 */

import { describe, it, expect } from 'vitest';
import {
  SortField,
  SortDirection,
  applySortPreference,
  validateSortPreference,
  DEFAULT_SORT,
} from './sorting.service.js';
import type { SortableProduct } from './sorting.service.js';

const products: SortableProduct[] = [
  { id: '1', title: 'Alpha', price: 500, createdAt: new Date('2024-01-01'), popularity: 100 },
  { id: '2', title: 'Bravo', price: 300, createdAt: new Date('2024-06-01'), popularity: 50 },
  { id: '3', title: 'Charlie', price: 700, createdAt: new Date('2024-03-01'), popularity: 200 },
];

describe('SortingService', () => {
  describe('applySortPreference', () => {
    it('sorts by price ascending', () => {
      const sorted = applySortPreference(products, {
        field: SortField.PRICE,
        direction: SortDirection.ASC,
      });
      expect(sorted.map((p) => p.id)).toEqual(['2', '1', '3']);
    });

    it('sorts by price descending', () => {
      const sorted = applySortPreference(products, {
        field: SortField.PRICE,
        direction: SortDirection.DESC,
      });
      expect(sorted.map((p) => p.id)).toEqual(['3', '1', '2']);
    });

    it('sorts by newest first', () => {
      const sorted = applySortPreference(products, {
        field: SortField.NEWEST,
        direction: SortDirection.DESC,
      });
      expect(sorted.map((p) => p.id)).toEqual(['2', '3', '1']);
    });

    it('sorts by popularity descending', () => {
      const sorted = applySortPreference(products, {
        field: SortField.POPULARITY,
        direction: SortDirection.DESC,
      });
      expect(sorted.map((p) => p.id)).toEqual(['3', '1', '2']);
    });

    it('sorts by title ascending (alphabetical)', () => {
      const sorted = applySortPreference(products, {
        field: SortField.TITLE,
        direction: SortDirection.ASC,
      });
      expect(sorted.map((p) => p.id)).toEqual(['1', '2', '3']);
    });

    it('does not mutate original array', () => {
      const original = [...products];
      applySortPreference(products, {
        field: SortField.PRICE,
        direction: SortDirection.ASC,
      });
      expect(products).toEqual(original);
    });

    it('returns empty array for empty input', () => {
      const sorted = applySortPreference([], DEFAULT_SORT);
      expect(sorted).toEqual([]);
    });

    it('uses default sort (recommended/unchanged) when field is RECOMMENDED', () => {
      const sorted = applySortPreference(products, {
        field: SortField.RECOMMENDED,
        direction: SortDirection.DESC,
      });
      // RECOMMENDED preserves the order from the recommendation engine
      expect(sorted.map((p) => p.id)).toEqual(['1', '2', '3']);
    });
  });

  describe('validateSortPreference', () => {
    it('accepts valid sort preference', () => {
      const result = validateSortPreference({
        field: SortField.PRICE,
        direction: SortDirection.ASC,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid field', () => {
      const result = validateSortPreference({
        field: 'invalid' as SortField,
        direction: SortDirection.ASC,
      });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid direction', () => {
      const result = validateSortPreference({
        field: SortField.PRICE,
        direction: 'sideways' as SortDirection,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('DEFAULT_SORT', () => {
    it('defaults to RECOMMENDED descending', () => {
      expect(DEFAULT_SORT.field).toBe(SortField.RECOMMENDED);
      expect(DEFAULT_SORT.direction).toBe(SortDirection.DESC);
    });
  });
});
