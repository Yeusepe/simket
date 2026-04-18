/**
 * Purpose: Load and validate Today editorial sections from the PayloadCMS REST
 * surface exposed to the storefront.
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
import { useCallback, useEffect, useState } from 'react';
import type { EditorialItem, EditorialSection, UseEditorialResult } from './today-types';
import { TODAY_LAYOUTS } from './today-types';

type RawPaginatedResponse<T> = {
  readonly docs: readonly T[];
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
  readonly limit: number;
  readonly pagingCounter: number;
  readonly totalDocs: number;
  readonly totalPages: number;
};

type RawMediaAsset = {
  readonly id: string;
  readonly url: string;
  readonly filename: string;
};

type RawSection = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly layout: EditorialSection['layout'];
  readonly sortOrder: number;
  readonly isActive: boolean;
};

type RawArticle = {
  readonly id: string;
  readonly title: string;
  readonly excerpt: string;
  readonly heroImage: RawMediaAsset;
  readonly heroTransparent?: RawMediaAsset;
  readonly author: string;
  readonly publishedAt: string;
  readonly slug: string;
  readonly status: 'draft' | 'published' | 'archived';
  readonly tags: readonly string[];
  readonly section?: RawSection;
};

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

function isRawMediaAsset(value: unknown): value is RawMediaAsset {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.url) &&
    isString(value.filename)
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
    typeof value.isActive === 'boolean'
  );
}

function isRawArticle(value: unknown): value is RawArticle {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.title) &&
    typeof value.excerpt === 'string' &&
    isRawMediaAsset(value.heroImage) &&
    (value.heroTransparent === undefined || isRawMediaAsset(value.heroTransparent)) &&
    isString(value.author) &&
    isString(value.publishedAt) &&
    isString(value.slug) &&
    (value.status === 'draft' || value.status === 'published' || value.status === 'archived') &&
    isStringArray(value.tags) &&
    (value.section === undefined || isRawSection(value.section))
  );
}

function isPaginatedResponse<T>(
  value: unknown,
  guard: (entry: unknown) => entry is T,
): value is RawPaginatedResponse<T> {
  return (
    isRecord(value) &&
    Array.isArray(value.docs) &&
    value.docs.every((entry) => guard(entry)) &&
    typeof value.hasNextPage === 'boolean' &&
    typeof value.hasPrevPage === 'boolean' &&
    typeof value.limit === 'number' &&
    typeof value.pagingCounter === 'number' &&
    typeof value.totalDocs === 'number' &&
    typeof value.totalPages === 'number'
  );
}

function getEditorialBaseUrl(): string {
  const envBaseUrl = import.meta.env.VITE_EDITORIAL_API_URL;
  return typeof envBaseUrl === 'string' && envBaseUrl.length > 0
    ? envBaseUrl
    : window.location.origin;
}

function buildCollectionUrl(
  collection: 'editorial-sections' | 'articles',
  params: Record<string, string>,
): URL {
  const url = new URL(`/api/${collection}`, getEditorialBaseUrl());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function fetchCollection<T>(
  url: URL,
  signal: AbortSignal,
  guard: (entry: unknown) => entry is T,
  collectionName: string,
): Promise<readonly T[]> {
  const response = await globalThis.fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${collectionName}: ${response.status}.`);
  }

  const json = (await response.json()) as unknown;
  if (!isPaginatedResponse(json, guard)) {
    throw new Error(`Invalid ${collectionName} response.`);
  }

  return json.docs;
}

function mapArticleToItem(article: RawArticle): EditorialItem {
  return {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    heroImage: article.heroImage.url,
    heroTransparent: article.heroTransparent?.url,
    author: article.author,
    publishedAt: article.publishedAt,
    slug: article.slug,
    tags: article.tags,
  };
}

async function loadEditorialSections(signal: AbortSignal): Promise<readonly EditorialSection[]> {
  const [rawSections, rawArticles] = await Promise.all([
    fetchCollection(
      buildCollectionUrl('editorial-sections', {
        sort: 'sortOrder',
        where: JSON.stringify({ isActive: { equals: true } }),
      }),
      signal,
      isRawSection,
      'editorial sections',
    ),
    fetchCollection(
      buildCollectionUrl('articles', {
        depth: '2',
        limit: '100',
        sort: '-publishedAt',
        where: JSON.stringify({ status: { equals: 'published' } }),
      }),
      signal,
      isRawArticle,
      'editorial articles',
    ),
  ]);

  const itemsBySectionId = new Map<string, EditorialItem[]>();

  for (const article of rawArticles) {
    if (!article.section) {
      continue;
    }

    const sectionItems = itemsBySectionId.get(article.section.id) ?? [];
    sectionItems.push(mapArticleToItem(article));
    itemsBySectionId.set(article.section.id, sectionItems);
  }

  return [...rawSections]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
    .map((section) => ({
      id: section.id,
      name: section.name,
      slug: section.slug,
      layout: section.layout,
      sortOrder: section.sortOrder,
      items: itemsBySectionId.get(section.id) ?? [],
    }));
}

export function useEditorial(): UseEditorialResult {
  const [sections, setSections] = useState<readonly EditorialSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    setIsLoading(true);
    setError(undefined);

    void loadEditorialSections(abortController.signal)
      .then((nextSections) => {
        setSections(nextSections);
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
  }, [requestVersion]);

  const refetch = useCallback(() => {
    setRequestVersion((current) => current + 1);
  }, []);

  return {
    sections,
    isLoading,
    error,
    refetch,
  };
}
