/**
 * Purpose: Generate normalized editorial slugs and provide reusable Payload field
 * helpers for slug-backed collections.
 *
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://payloadcms.com/docs
 *   - https://github.com/payloadcms/payload
 * Tests:
 *   - packages/editorial/tests/articles.test.ts
 */

import type { TextField } from 'payload';

export function generateEditorialSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

type AutoSlugFieldOptions = {
  readonly name?: string;
  readonly sourceField: string;
};

export function createAutoSlugField(options: AutoSlugFieldOptions): TextField {
  const { name = 'slug', sourceField } = options;

  return {
    name,
    type: 'text',
    required: true,
    unique: true,
    index: true,
    hooks: {
      beforeValidate: [
        ({ value, siblingData, data }) => {
          if (typeof value === 'string' && value.trim().length > 0) {
            return generateEditorialSlug(value);
          }

          const candidate = siblingData[sourceField] ?? data?.[sourceField];
          return typeof candidate === 'string' ? generateEditorialSlug(candidate) : value;
        },
      ],
    },
  };
}
