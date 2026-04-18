/**
 * Purpose: Public API for the sorting plugin.
 *
 * Governing docs:
 *   - docs/architecture.md §9 (Recommendations)
 * Tests:
 *   - packages/vendure-server/src/plugins/sorting/sorting.service.test.ts
 */

export {
  SortField,
  SortDirection,
  DEFAULT_SORT,
  applySortPreference,
  validateSortPreference,
} from './sorting.service.js';
export type { SortPreference, SortableProduct } from './sorting.service.js';
