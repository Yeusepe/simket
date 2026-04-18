/**
 * Purpose: Fetch and mutate creator/storefront templates through Vendure's admin API with boundary validation.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/regular-programming-practices/interfaces-and-data-flow.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - https://developer.mozilla.org/docs/Web/API/Fetch_API
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/use-templates.test.ts
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PageBlock } from '../../../builder';
import type {
  DeleteTemplateInput,
  DuplicateTemplateInput,
  PageTemplate,
  SaveTemplateFromPageInput,
  TemplateCategory,
  TemplateListRequest,
  TemplateScope,
  TemplatesApi,
  UseTemplatesOptions,
  UseTemplatesResult,
} from './template-types';

interface GraphqlError {
  readonly message: string;
}

interface TemplateLoadRequest extends Omit<Partial<TemplateListRequest>, 'category'> {
  readonly category?: TemplateCategory | 'all';
}

interface GraphqlResponse<TData> {
  readonly data?: TData;
  readonly errors?: readonly GraphqlError[];
}

const LIST_TEMPLATES_QUERY = `
  query ListTemplates($creatorId: String, $category: String, $scope: String, $skip: Int, $take: Int) {
    templates(creatorId: $creatorId, category: $category, scope: $scope, skip: $skip, take: $take) {
      id
      name
      description
      thumbnail
      category
      blocks
      isSystem
      creatorId
      usageCount
      createdAt
      updatedAt
    }
  }
`;

const CREATE_TEMPLATE_MUTATION = `
  mutation CreateTemplateFromPage(
    $pageId: String!
    $name: String!
    $description: String
    $thumbnail: String
    $category: String!
    $creatorId: String
    $isSystem: Boolean
  ) {
    createTemplateFromPage(
      pageId: $pageId
      name: $name
      description: $description
      thumbnail: $thumbnail
      category: $category
      creatorId: $creatorId
      isSystem: $isSystem
    ) {
      id
      name
      description
      thumbnail
      category
      blocks
      isSystem
      creatorId
      usageCount
      createdAt
      updatedAt
    }
  }
`;

const DUPLICATE_TEMPLATE_MUTATION = `
  mutation DuplicateTemplate($templateId: String!, $creatorId: String!, $name: String) {
    duplicateTemplate(templateId: $templateId, creatorId: $creatorId, name: $name) {
      id
      name
      description
      thumbnail
      category
      blocks
      isSystem
      creatorId
      usageCount
      createdAt
      updatedAt
    }
  }
`;

const DELETE_TEMPLATE_MUTATION = `
  mutation DeleteTemplate($templateId: String!, $creatorId: String!) {
    deleteTemplate(templateId: $templateId, creatorId: $creatorId)
  }
`;

function getAdminApiUrl(): string {
  const configuredUrl = import.meta.env.VITE_SIMKET_ADMIN_API_URL;
  if (typeof configuredUrl === 'string' && configuredUrl.length > 0) {
    return configuredUrl;
  }

  return new URL('/admin-api', window.location.origin).toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTemplateCategory(value: unknown): value is TemplateCategory {
  return value === 'store-page' || value === 'product-page' || value === 'landing-page';
}

function isPageBlock(value: unknown): value is PageBlock {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.type === 'string' &&
    value.type.length > 0 &&
    isRecord(value.props)
  );
}

function isPageTemplate(value: unknown): value is PageTemplate {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isTemplateCategory(value.category) &&
    Array.isArray(value.blocks) &&
    value.blocks.every(isPageBlock) &&
    typeof value.isSystem === 'boolean' &&
    typeof value.usageCount === 'number' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    (value.description === undefined || value.description === null || typeof value.description === 'string') &&
    (value.thumbnail === undefined || value.thumbnail === null || typeof value.thumbnail === 'string') &&
    (value.creatorId === undefined || value.creatorId === null || typeof value.creatorId === 'string')
  );
}

function normalizeTemplate(value: unknown): PageTemplate {
  if (!isPageTemplate(value)) {
    throw new Error('Invalid storefront template response.');
  }

  return value;
}

function normalizeTemplateList(value: unknown): readonly PageTemplate[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid storefront template list response.');
  }

  return value.map((item) => normalizeTemplate(item));
}

async function fetchAdminGraphql<TData>(
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> {
  const response = await globalThis.fetch(getAdminApiUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`Template request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GraphqlResponse<TData>;
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0]?.message ?? 'Template request failed.');
  }

  if (!payload.data) {
    throw new Error('Template response did not include data.');
  }

  return payload.data;
}

export function createTemplatesApi(): TemplatesApi {
  return {
    async listTemplates(request) {
      const data = await fetchAdminGraphql<{ templates: unknown }>(LIST_TEMPLATES_QUERY, {
        creatorId: request.creatorId ?? null,
        category: request.category ?? null,
        scope: request.scope ?? null,
        skip: request.skip ?? null,
        take: request.take ?? null,
      });

      return normalizeTemplateList(data.templates);
    },
    async createTemplateFromPage(input) {
      const data = await fetchAdminGraphql<{ createTemplateFromPage: unknown }>(
        CREATE_TEMPLATE_MUTATION,
        {
          pageId: input.pageId,
          name: input.name,
          description: input.description ?? null,
          thumbnail: input.thumbnail ?? null,
          category: input.category,
          creatorId: input.creatorId ?? null,
          isSystem: input.isSystem ?? null,
        },
      );

      return normalizeTemplate(data.createTemplateFromPage);
    },
    async duplicateTemplate(input) {
      const data = await fetchAdminGraphql<{ duplicateTemplate: unknown }>(
        DUPLICATE_TEMPLATE_MUTATION,
        {
          templateId: input.templateId,
          creatorId: input.creatorId,
          name: input.name ?? null,
        },
      );

      return normalizeTemplate(data.duplicateTemplate);
    },
    async deleteTemplate(input) {
      const data = await fetchAdminGraphql<{ deleteTemplate: unknown }>(
        DELETE_TEMPLATE_MUTATION,
        {
          templateId: input.templateId,
          creatorId: input.creatorId,
        },
      );

      if (typeof data.deleteTemplate !== 'boolean') {
        throw new Error('Invalid template delete response.');
      }

      return data.deleteTemplate;
    },
  };
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Template management failed.';
}

function upsertTemplate(
  templates: readonly PageTemplate[],
  template: PageTemplate,
): readonly PageTemplate[] {
  const others = templates.filter((item) => item.id !== template.id);
  return [template, ...others];
}

function matchesFilter(
  template: PageTemplate,
  filter: {
    readonly creatorId?: string;
    readonly category?: TemplateCategory | 'all';
    readonly scope: TemplateScope;
  },
): boolean {
  const matchesCategory = !filter.category || filter.category === 'all' || template.category === filter.category;
  if (!matchesCategory) {
    return false;
  }

  switch (filter.scope) {
    case 'system':
      return template.isSystem;
    case 'personal':
      return !template.isSystem && template.creatorId === filter.creatorId;
    case 'all':
    default:
      return template.isSystem || (!!filter.creatorId && template.creatorId === filter.creatorId);
  }
}

export function useTemplates(options: UseTemplatesOptions = {}): UseTemplatesResult {
  const {
    api: providedApi,
    creatorId,
    initialCategory = 'all',
    initialScope = 'all',
    autoLoad = true,
  } = options;
  const api = useMemo(() => providedApi ?? createTemplatesApi(), [providedApi]);
  const [templates, setTemplates] = useState<readonly PageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{
    readonly creatorId?: string;
    readonly category?: TemplateCategory | 'all';
    readonly scope: TemplateScope;
  }>({
    creatorId,
    category: initialCategory,
    scope: initialScope,
  });

  const loadTemplates = useCallback(
    async (request: TemplateLoadRequest = {}) => {
      const nextFilter = {
        creatorId: request.creatorId ?? creatorId,
        category: request.category ?? activeFilter.category,
        scope: request.scope ?? activeFilter.scope,
      } as const;

      setIsLoading(true);
      setError(null);

      try {
        const results = await api.listTemplates({
          creatorId: nextFilter.creatorId,
          category: nextFilter.category === 'all' ? undefined : nextFilter.category,
          scope: nextFilter.scope,
          skip: request.skip,
          take: request.take,
        });

        setTemplates(results);
        setActiveFilter(nextFilter);
      } catch (nextError) {
        setError(normalizeError(nextError));
      } finally {
        setIsLoading(false);
      }
    },
    [activeFilter.category, activeFilter.scope, api, creatorId],
  );

  const saveTemplateFromPage = useCallback(
    async (input: SaveTemplateFromPageInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const template = await api.createTemplateFromPage(input);
        setTemplates((current) =>
          matchesFilter(template, activeFilter) ? upsertTemplate(current, template) : current,
        );
        return template;
      } catch (nextError) {
        setError(normalizeError(nextError));
        return undefined;
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeFilter, api],
  );

  const duplicateTemplate = useCallback(
    async (input: DuplicateTemplateInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const template = await api.duplicateTemplate(input);
        setTemplates((current) =>
          matchesFilter(template, activeFilter) ? upsertTemplate(current, template) : current,
        );
        return template;
      } catch (nextError) {
        setError(normalizeError(nextError));
        return undefined;
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeFilter, api],
  );

  const deleteTemplate = useCallback(
    async (input: DeleteTemplateInput) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const deleted = await api.deleteTemplate(input);
        if (deleted) {
          setTemplates((current) => current.filter((template) => template.id !== input.templateId));
        }
        return deleted;
      } catch (nextError) {
        setError(normalizeError(nextError));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [api],
  );

  useEffect(() => {
    if (autoLoad) {
      void loadTemplates({
        creatorId,
        category: initialCategory,
        scope: initialScope,
      });
    }
  }, [autoLoad, creatorId, initialCategory, initialScope, loadTemplates]);

  return {
    templates,
    isLoading,
    isSubmitting,
    error,
    activeFilter,
    loadTemplates,
    saveTemplateFromPage,
    duplicateTemplate,
    deleteTemplate,
  };
}
