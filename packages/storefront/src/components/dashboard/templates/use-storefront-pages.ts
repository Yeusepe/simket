/**
 * Purpose: Load and persist creator-owned Framely store/product pages through
 *          Vendure's shop API for dashboard editing flows.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin, §12 source of truth)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/use-storefront-pages.test.ts
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PageSchema } from '../../../builder';
import { createCreatorStorefrontPagesApi } from '../../../services/catalog-api';

export type StorefrontPageScope = 'universal' | 'product';

export interface EditableStorefrontPageTarget {
  readonly scope: StorefrontPageScope;
  readonly slug: string;
  readonly title: string;
  readonly productId?: string;
}

export interface CreatorStorefrontPageRecord {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly scope: StorefrontPageScope;
  readonly productId: string | null;
  readonly enabled: boolean;
  readonly schema: PageSchema;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UpsertCreatorStorefrontPageInput {
  readonly pageId?: string;
  readonly title: string;
  readonly slug: string;
  readonly scope: StorefrontPageScope;
  readonly productId?: string;
  readonly schema: PageSchema;
  readonly enabled?: boolean;
}

export interface CreatorStorefrontPageApi {
  readonly loadPage: (
    target: Pick<EditableStorefrontPageTarget, 'scope' | 'slug' | 'productId'>,
  ) => Promise<CreatorStorefrontPageRecord | null>;
  readonly savePage: (input: UpsertCreatorStorefrontPageInput) => Promise<CreatorStorefrontPageRecord>;
}

export interface UseStorefrontPageOptions {
  readonly api?: CreatorStorefrontPageApi;
  readonly target?: EditableStorefrontPageTarget | null;
  readonly autoLoad?: boolean;
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Storefront page request failed.';
}

export function useStorefrontPage(options: UseStorefrontPageOptions = {}) {
  const { api: providedApi, target, autoLoad = true } = options;
  const api = useMemo(() => providedApi ?? createCreatorStorefrontPagesApi(), [providedApi]);
  const [page, setPage] = useState<CreatorStorefrontPageRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const targetScope = target?.scope;
  const targetSlug = target?.slug;
  const targetProductId = target?.productId;

  const loadPage = useCallback(async () => {
    if (!targetScope || !targetSlug) {
      setPage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextPage = await api.loadPage({
        scope: targetScope,
        slug: targetSlug,
        productId: targetProductId,
      });
      setPage(nextPage);
      return nextPage;
    } catch (nextError) {
      setError(normalizeError(nextError));
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [api, targetProductId, targetScope, targetSlug]);

  const savePage = useCallback(
    async (input: Omit<UpsertCreatorStorefrontPageInput, 'pageId'> & { readonly pageId?: string }) => {
      setIsSaving(true);
      setError(null);
      try {
        const savedPage = await api.savePage(input);
        setPage(savedPage);
        return savedPage;
      } catch (nextError) {
        setError(normalizeError(nextError));
        return undefined;
      } finally {
        setIsSaving(false);
      }
    },
    [api],
  );

  useEffect(() => {
    if (autoLoad) {
      void loadPage();
    }
  }, [autoLoad, loadPage, targetProductId, targetScope, targetSlug]);

  return {
    page,
    isLoading,
    isSaving,
    error,
    loadPage,
    savePage,
  } as const;
}
