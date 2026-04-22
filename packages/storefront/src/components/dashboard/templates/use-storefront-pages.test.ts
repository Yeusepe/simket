/**
 * Purpose: Verify creator storefront-page hook loading, creation, update, and
 *          explicit error handling for the page builder save flow.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 * External references:
 *   - https://testing-library.com/docs/react-testing-library/api/#renderhook
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/use-storefront-pages.test.ts
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultProductPageSchema } from '../../../builder';
import {
  useStorefrontPage,
  type CreatorStorefrontPageApi,
  type CreatorStorefrontPageRecord,
} from './use-storefront-pages';

function createPage(overrides: Partial<CreatorStorefrontPageRecord> = {}): CreatorStorefrontPageRecord {
  return {
    id: overrides.id ?? 'page-1',
    title: overrides.title ?? 'Store home page',
    slug: overrides.slug ?? 'home',
    scope: overrides.scope ?? 'universal',
    productId: overrides.productId ?? null,
    enabled: overrides.enabled ?? true,
    schema: overrides.schema ?? createDefaultProductPageSchema(),
    createdAt: overrides.createdAt ?? '2025-02-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2025-02-02T00:00:00.000Z',
  };
}

function createApi(): CreatorStorefrontPageApi {
  return {
    async loadPage() {
      return createPage();
    },
    async savePage(input) {
      return createPage({
        id: input.pageId ?? 'page-created',
        title: input.title,
        slug: input.slug,
        scope: input.scope,
        productId: input.productId ?? null,
        schema: input.schema,
        updatedAt: '2025-02-03T00:00:00.000Z',
      });
    },
  };
}

describe('useStorefrontPage', () => {
  it('loads the targeted storefront page on mount and saves updates', async () => {
    const api = createApi();
    const { result } = renderHook(() =>
      useStorefrontPage({
        api,
        target: {
          scope: 'universal',
          slug: 'home',
          title: 'Store home page',
        },
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.page?.slug).toBe('home');

    await act(async () => {
      await result.current.savePage({
        pageId: result.current.page?.id,
        title: 'Updated store home page',
        slug: 'home',
        scope: 'universal',
        schema: createDefaultProductPageSchema(),
      });
    });

    expect(result.current.page?.title).toBe('Updated store home page');
    expect(result.current.page?.updatedAt).toBe('2025-02-03T00:00:00.000Z');
  });

  it('surfaces api failures as user-facing error copy', async () => {
    const api: CreatorStorefrontPageApi = {
      ...createApi(),
      loadPage: vi.fn(async () => {
        throw new Error('Storefront pages unavailable');
      }),
    };
    const { result } = renderHook(() =>
      useStorefrontPage({
        api,
        target: {
          scope: 'universal',
          slug: 'home',
          title: 'Store home page',
        },
      }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Storefront pages unavailable');
    expect(result.current.page).toBeNull();
  });
});
