/**
 * Purpose: Verify storefront template hook loading, mutation updates, and explicit API error handling.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://testing-library.com/docs/react-testing-library/api/#renderhook
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/use-templates.test.ts
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createPageSchema } from '../../../builder';
import { useTemplates } from './use-templates';
import type { PageTemplate, TemplatesApi } from './template-types';

function createTemplate(overrides: Partial<PageTemplate> = {}): PageTemplate {
  return {
    id: overrides.id ?? 'template-1',
    name: overrides.name ?? 'Landing Starter',
    description: overrides.description ?? 'Hero and CTA starter.',
    thumbnail: overrides.thumbnail ?? 'https://cdn.example.com/template.png',
    category: overrides.category ?? 'landing-page',
    blocks:
      overrides.blocks ??
      createPageSchema({
        blocks: [{ id: 'hero-1', type: 'hero', props: { title: 'Welcome' } }],
      }).blocks,
    isSystem: overrides.isSystem ?? true,
    creatorId: overrides.creatorId ?? null,
    usageCount: overrides.usageCount ?? 5,
    createdAt: overrides.createdAt ?? '2025-02-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2025-02-02T00:00:00.000Z',
  };
}

function createApi(): TemplatesApi {
  return {
    async listTemplates() {
      return [
        createTemplate({ id: 'system-1', isSystem: true }),
        createTemplate({ id: 'personal-1', isSystem: false, creatorId: 'creator-1', name: 'My Saved Template' }),
      ];
    },
    async createTemplateFromPage(input) {
      return createTemplate({
        id: 'template-created',
        name: input.name,
        description: input.description,
        thumbnail: input.thumbnail,
        category: input.category,
        isSystem: false,
        creatorId: input.creatorId ?? null,
        usageCount: 0,
      });
    },
    async duplicateTemplate(input) {
      return createTemplate({
        id: 'template-copy',
        name: input.name ?? 'Landing Starter Copy',
        isSystem: false,
        creatorId: input.creatorId,
        usageCount: 0,
      });
    },
    async deleteTemplate() {
      return true;
    },
  };
}

describe('useTemplates', () => {
  it('loads templates on mount and saves new personal templates', async () => {
    const api = createApi();
    const { result } = renderHook(() =>
      useTemplates({ api, creatorId: 'creator-1' }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.templates).toHaveLength(2);

    await act(async () => {
      await result.current.saveTemplateFromPage({
        pageId: 'page-1',
        creatorId: 'creator-1',
        name: 'Builder Save',
        category: 'store-page',
      });
    });

    expect(result.current.templates.some((template) => template.name === 'Builder Save')).toBe(true);
  });

  it('duplicates and deletes templates in local state', async () => {
    const api = createApi();
    const { result } = renderHook(() =>
      useTemplates({ api, creatorId: 'creator-1' }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.duplicateTemplate({
        templateId: 'system-1',
        creatorId: 'creator-1',
      });
    });

    expect(result.current.templates.some((template) => template.id === 'template-copy')).toBe(true);

    await act(async () => {
      await result.current.deleteTemplate({
        templateId: 'personal-1',
        creatorId: 'creator-1',
      });
    });

    expect(result.current.templates.some((template) => template.id === 'personal-1')).toBe(false);
  });

  it('surfaces api failures as user-facing error copy', async () => {
    const api: TemplatesApi = {
      ...createApi(),
      listTemplates: vi.fn(async () => {
        throw new Error('Templates unavailable');
      }),
    };
    const { result } = renderHook(() => useTemplates({ api }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Templates unavailable');
    expect(result.current.templates).toEqual([]);
  });
});
