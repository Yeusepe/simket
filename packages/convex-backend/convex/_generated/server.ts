/**
 * Purpose: Local Convex server helpers mirroring the generated query and
 * mutation wrappers used by Convex projects.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.convex.dev/functions/query-functions
 *   - https://docs.convex.dev/functions/mutation-functions
 * Tests:
 *   - packages/convex-backend/src/validators.test.ts
 */

import {
  mutationGeneric,
  queryGeneric,
} from 'convex/server';

export const query = queryGeneric;
export const mutation = mutationGeneric;
