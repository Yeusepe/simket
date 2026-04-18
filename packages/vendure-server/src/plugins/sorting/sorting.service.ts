/**
 * Purpose: Sorting preferences for recommended/discovered products.
 *
 * Provides user-configurable sorting that can be applied on top of
 * recommendation engine output. "RECOMMENDED" sort preserves the
 * engine's ranking; other fields let users override.
 *
 * Governing docs:
 *   - docs/architecture.md §9 (Recommendations)
 * Tests:
 *   - packages/vendure-server/src/plugins/sorting/sorting.service.test.ts
 */

export enum SortField {
  /** Preserve recommendation engine order (default). */
  RECOMMENDED = 'RECOMMENDED',
  PRICE = 'PRICE',
  NEWEST = 'NEWEST',
  POPULARITY = 'POPULARITY',
  TITLE = 'TITLE',
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface SortPreference {
  readonly field: SortField;
  readonly direction: SortDirection;
}

/** Default sort: preserve recommendation engine ranking. */
export const DEFAULT_SORT: SortPreference = {
  field: SortField.RECOMMENDED,
  direction: SortDirection.DESC,
};

/** Minimal shape for a sortable product. */
export interface SortableProduct {
  readonly id: string;
  readonly title: string;
  readonly price: number;
  readonly createdAt: Date;
  readonly popularity: number;
}

/**
 * Apply a user's sort preference to a list of products.
 *
 * RECOMMENDED sort preserves the input order (from the recommendation engine).
 * All other sorts re-order the array. The original array is NOT mutated.
 */
export function applySortPreference<T extends SortableProduct>(
  products: readonly T[],
  pref: SortPreference,
): T[] {
  if (pref.field === SortField.RECOMMENDED) {
    return [...products];
  }

  const multiplier = pref.direction === SortDirection.ASC ? 1 : -1;
  const copy = [...products];

  copy.sort((a, b) => {
    let cmp: number;
    switch (pref.field) {
      case SortField.PRICE:
        cmp = a.price - b.price;
        break;
      case SortField.NEWEST:
        cmp = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case SortField.POPULARITY:
        cmp = a.popularity - b.popularity;
        break;
      case SortField.TITLE:
        cmp = a.title.localeCompare(b.title);
        break;
      default:
        cmp = 0;
    }
    return cmp * multiplier;
  });

  return copy;
}

/**
 * Validate a sort preference.
 */
export function validateSortPreference(pref: {
  field: string;
  direction: string;
}): { valid: boolean; error?: string } {
  const validFields = Object.values(SortField) as string[];
  const validDirections = Object.values(SortDirection) as string[];

  if (!validFields.includes(pref.field)) {
    return { valid: false, error: `Invalid sort field: ${pref.field}` };
  }
  if (!validDirections.includes(pref.direction)) {
    return { valid: false, error: `Invalid sort direction: ${pref.direction}` };
  }
  return { valid: true };
}
