/**
 * Purpose: Load and auto-refresh Today editorial collections from the
 * vendure-server editorial gateway exposed to the storefront.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://payloadcms.com/docs/rest-api/overview
 *   - https://react.dev/reference/react/useEffect
 * Tests:
 *   - packages/storefront/src/components/today/use-editorial.test.ts
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EditorialItem, EditorialSection, UseEditorialResult } from './today-types';
import { TODAY_LAYOUTS } from './today-types';
import { fetchCatalogProducts } from '../../services/catalog-api';
import type { ProductListItem } from '../../types/product';

type Fetcher = typeof globalThis.fetch;

type RawItem = {
  readonly id: string;
  readonly title: string;
  readonly excerpt: string;
  readonly heroImage: string;
  readonly heroTransparent?: string;
  readonly author: string;
  readonly creatorName?: string;
  readonly productThumbnailUrl?: string;
  readonly productName?: string;
  readonly spotlightEyebrow?: string;
  readonly spotlightSubline?: string;
  readonly spotlightPriceFormatted?: string;
  readonly hideSpotlightPrice?: boolean;
  readonly hideSpotlightCta?: boolean;
  readonly publishedAt: string;
  readonly slug: string;
  readonly tags: readonly string[];
  /** Optional dev / CMS accent (hex). Falls back to mock lookup by slug when absent. */
  readonly previewColor?: string;
};

type RawSection = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly layout: EditorialSection['layout'];
  readonly sortOrder: number;
  readonly items: readonly RawItem[];
};

type RawCollectionsResponse = {
  readonly collections: readonly RawSection[];
};

type RawUpdatesResponse = {
  readonly hasUpdate: boolean;
  readonly version: number;
};

interface UseEditorialOptions {
  readonly fetcher?: Fetcher;
  readonly pollIntervalMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 30_000;

function formatPrice(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function mapCatalogProductToEditorialItem(product: ProductListItem): EditorialItem {
  return {
    id: `catalog-${product.id}`,
    title: product.name,
    excerpt: product.description,
    heroImage: product.heroImageUrl ?? product.heroTransparentUrl ?? '',
    heroTransparent: product.heroTransparentUrl ?? undefined,
    author: product.creatorName,
    creatorName: product.creatorName,
    productThumbnailUrl: product.heroImageUrl ?? product.heroTransparentUrl ?? undefined,
    productName: product.name,
    spotlightSubline: product.description,
    spotlightPriceFormatted: formatPrice(product.priceMin, product.currencyCode),
    publishedAt: new Date().toISOString(),
    slug: product.slug,
    tags: product.tags,
    previewColor: product.previewColor ?? null,
  };
}

function buildCatalogFallbackSections(products: readonly ProductListItem[]): readonly EditorialSection[] {
  const items = products
    .filter((product) => (product.heroImageUrl ?? product.heroTransparentUrl ?? '').length > 0)
    .map(mapCatalogProductToEditorialItem);

  if (items.length === 0) {
    return [];
  }

  const sections: EditorialSection[] = [];
  const featuredItem = items[0];
  if (featuredItem) {
    sections.push({
      id: 'catalog-featured',
      name: 'Featured today',
      slug: 'featured-today',
      layout: 'hero-banner',
      sortOrder: 0,
      items: [featuredItem],
    });
  }

  const editorPicks = items.slice(1, 5);
  if (editorPicks.length > 0) {
    sections.push({
      id: 'catalog-editor-picks',
      name: 'Editor picks',
      slug: 'editor-picks',
      layout: 'card-grid-4',
      sortOrder: 1,
      items: editorPicks,
    });
  }

  const scrollingItems = items.slice(5);
  if (scrollingItems.length > 0) {
    sections.push({
      id: 'catalog-trending',
      name: 'Trending now',
      slug: 'trending-now',
      layout: 'horizontal-scroll',
      sortOrder: 2,
      items: scrollingItems,
    });
  }

  return sections;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isLayout(value: unknown): value is EditorialSection['layout'] {
  return typeof value === 'string' && TODAY_LAYOUTS.includes(value as EditorialSection['layout']);
}

function isRawItem(value: unknown): value is RawItem {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.title) &&
    typeof value.excerpt === 'string' &&
    isString(value.heroImage) &&
    (value.heroTransparent === undefined || isString(value.heroTransparent)) &&
    isString(value.author) &&
    (value.creatorName === undefined || isString(value.creatorName)) &&
    (value.productThumbnailUrl === undefined || isString(value.productThumbnailUrl)) &&
    (value.productName === undefined || isString(value.productName)) &&
    (value.spotlightEyebrow === undefined || isString(value.spotlightEyebrow)) &&
    (value.spotlightSubline === undefined || isString(value.spotlightSubline)) &&
    (value.spotlightPriceFormatted === undefined || isString(value.spotlightPriceFormatted)) &&
    (value.hideSpotlightPrice === undefined || typeof value.hideSpotlightPrice === 'boolean') &&
    (value.hideSpotlightCta === undefined || typeof value.hideSpotlightCta === 'boolean') &&
    isString(value.publishedAt) &&
    isString(value.slug) &&
    isStringArray(value.tags) &&
    (value.previewColor === undefined || isString(value.previewColor))
  );
}

function isRawSection(value: unknown): value is RawSection {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.slug) &&
    isLayout(value.layout) &&
    typeof value.sortOrder === 'number' &&
    Number.isFinite(value.sortOrder) &&
    Array.isArray(value.items) &&
    value.items.every((item) => isRawItem(item))
  );
}

function isCollectionsResponse(value: unknown): value is RawCollectionsResponse {
  return isRecord(value) && Array.isArray(value.collections) && value.collections.every(isRawSection);
}

function isUpdatesResponse(value: unknown): value is RawUpdatesResponse {
  return (
    isRecord(value) &&
    typeof value.hasUpdate === 'boolean' &&
    typeof value.version === 'number'
  );
}

function getEditorialBaseUrl(): string {
  const envBaseUrl = (import.meta as ImportMeta & {
    readonly env?: Record<string, string | undefined>;
  }).env?.VITE_EDITORIAL_API_URL;
  return typeof envBaseUrl === 'string' && envBaseUrl.length > 0
    ? envBaseUrl
    : window.location.origin;
}

function buildGatewayUrl(path: string, params: Record<string, string> = {}): URL {
  const url = new URL(path, getEditorialBaseUrl());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function fetchJson<T>(
  fetcher: Fetcher,
  url: URL,
  signal: AbortSignal,
  validate: (value: unknown) => value is T,
  resourceName: string,
): Promise<T> {
  const response = await fetcher(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${resourceName}: ${response.status}.`);
  }

  const json = (await response.json()) as unknown;
  if (!validate(json)) {
    throw new Error(`Invalid ${resourceName} response.`);
  }

  return json;
}

function mapItem(item: RawItem): EditorialItem {
  return {
    id: item.id,
    title: item.title,
    excerpt: item.excerpt,
    heroImage: item.heroImage,
    heroTransparent: item.heroTransparent,
    author: item.author,
    creatorName: item.creatorName,
    productThumbnailUrl: item.productThumbnailUrl,
    productName: item.productName,
    spotlightEyebrow: item.spotlightEyebrow,
    spotlightSubline: item.spotlightSubline,
    spotlightPriceFormatted: item.spotlightPriceFormatted,
    hideSpotlightPrice: item.hideSpotlightPrice,
    hideSpotlightCta: item.hideSpotlightCta,
    publishedAt: item.publishedAt,
    slug: item.slug,
    tags: item.tags,
    ...(item.previewColor !== undefined ? { previewColor: item.previewColor } : {}),
  };
}

async function loadEditorialState(
  fetcher: Fetcher,
  signal: AbortSignal,
): Promise<{
  readonly sections: readonly EditorialSection[];
  readonly version: number;
}> {
  const [collectionsResponse, updatesResponse] = await Promise.all([
    fetchJson(
      fetcher,
      buildGatewayUrl('/editorial/collections'),
      signal,
      isCollectionsResponse,
      'editorial collections',
    ),
    fetchJson(
      fetcher,
      buildGatewayUrl('/editorial/updates'),
      signal,
      isUpdatesResponse,
      'editorial updates',
    ),
  ]);

  return {
    sections: [...collectionsResponse.collections]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
      .map((section) => ({
        id: section.id,
        name: section.name,
        slug: section.slug,
        layout: section.layout,
        sortOrder: section.sortOrder,
        items: section.items.map(mapItem),
      })),
    version: updatesResponse.version,
  };
}

function isDevMode(): boolean {
  try {
    const env = (import.meta as ImportMeta & {
      readonly env?: {
        readonly DEV?: boolean;
        readonly MODE?: string;
      };
    }).env;
    return env?.DEV === true || env?.MODE === 'development';
  } catch {
    return false;
  }
}

export function useEditorial(options: UseEditorialOptions = {}): UseEditorialResult {
  const fetcher = useMemo<Fetcher>(
    () => options.fetcher ?? globalThis.fetch.bind(globalThis),
    [options.fetcher],
  );
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const [sections, setSections] = useState<readonly EditorialSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [version, setVersion] = useState(0);
  const [hasFreshContent, setHasFreshContent] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);

  // In dev mode without a CMS payload, fall back to the seeded catalog rather than mock data.
  const devMode = isDevMode() && !options.fetcher;
  useEffect(() => {
    if (!devMode) return;
    fetchCatalogProducts(12).then((products) => {
      setSections(buildCatalogFallbackSections(products));
      setError(undefined);
      setVersion(1);
      setIsLoading(false);
    }).catch((reason: unknown) => {
      setSections([]);
      setError(
        reason instanceof Error ? reason : new Error('Failed to load public editorial fallback.'),
      );
      setIsLoading(false);
    });
  }, [devMode]);

  useEffect(() => {
    if (devMode) return;
    const abortController = new AbortController();

    setIsLoading(true);
    setError(undefined);

    void loadEditorialState(fetcher, abortController.signal)
      .then((response) => {
        setSections(response.sections);
        setVersion(response.version);
        setIsLoading(false);
      })
      .catch((reason: unknown) => {
        if (
          reason instanceof DOMException &&
          reason.name === 'AbortError'
        ) {
          return;
        }

        setSections([]);
        setIsLoading(false);
        setError(
          reason instanceof Error ? reason : new Error('Failed to load editorial data.'),
        );
      });

    return () => {
      abortController.abort();
    };
  }, [devMode, fetcher, requestVersion]);

  useEffect(() => {
    if (devMode) return;
    const intervalId = globalThis.setInterval(() => {
      const abortController = new AbortController();

      void fetchJson(
        fetcher,
        buildGatewayUrl('/editorial/updates', { since: String(version) }),
        abortController.signal,
        isUpdatesResponse,
        'editorial updates',
      )
        .then((response) => {
          if (!response.hasUpdate || response.version <= version) {
            return;
          }

          return loadEditorialState(fetcher, abortController.signal).then((nextState) => {
            setSections(nextState.sections);
            setVersion(nextState.version);
            setHasFreshContent(true);
            setError(undefined);
          });
        })
        .catch((reason: unknown) => {
          if (
            reason instanceof DOMException &&
            reason.name === 'AbortError'
          ) {
            return;
          }

          setError(
            reason instanceof Error ? reason : new Error('Failed to refresh editorial data.'),
          );
        });
    }, pollIntervalMs);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [fetcher, pollIntervalMs, version]);

  const refetch = useCallback(() => {
    setHasFreshContent(false);
    setRequestVersion((current) => current + 1);
  }, []);

  const dismissFreshContent = useCallback(() => {
    setHasFreshContent(false);
  }, []);

  return {
    sections,
    isLoading,
    error,
    version,
    hasFreshContent,
    dismissFreshContent,
    refetch,
  };
}
