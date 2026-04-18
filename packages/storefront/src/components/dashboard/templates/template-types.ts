/**
 * Purpose: Shared storefront template management contracts for dashboard hooks, galleries, and picker flows.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/domain-model.md (§1 Core records, Storefront Template)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/extend-graphql-api/
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/use-templates.test.ts
 *   - packages/storefront/src/components/dashboard/templates/TemplateGallery.test.tsx
 *   - packages/storefront/src/components/dashboard/templates/TemplatePicker.test.tsx
 */
import type { PageBlock, PageSchema } from '../../../builder';

export type TemplateCategory = 'store-page' | 'product-page' | 'landing-page';

export type TemplateScope = 'all' | 'system' | 'personal';

export interface PageTemplate {
  readonly id: string;
  readonly name: string;
  readonly description?: string | null;
  readonly thumbnail?: string | null;
  readonly category: TemplateCategory;
  readonly blocks: readonly PageBlock[];
  readonly isSystem: boolean;
  readonly creatorId?: string | null;
  readonly usageCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TemplatePageSource {
  readonly id: string;
  readonly name: string;
  readonly category: TemplateCategory;
  readonly schema: PageSchema;
  readonly updatedAt: string;
}

export interface TemplateListRequest {
  readonly creatorId?: string;
  readonly category?: TemplateCategory;
  readonly scope?: TemplateScope;
  readonly skip?: number;
  readonly take?: number;
}

export interface SaveTemplateFromPageInput {
  readonly pageId: string;
  readonly creatorId?: string;
  readonly name: string;
  readonly description?: string;
  readonly thumbnail?: string;
  readonly category: TemplateCategory;
  readonly isSystem?: boolean;
}

export interface DuplicateTemplateInput {
  readonly templateId: string;
  readonly creatorId: string;
  readonly name?: string;
}

export interface DeleteTemplateInput {
  readonly templateId: string;
  readonly creatorId: string;
}

export interface TemplatesApi {
  listTemplates(request: TemplateListRequest): Promise<readonly PageTemplate[]>;
  createTemplateFromPage(input: SaveTemplateFromPageInput): Promise<PageTemplate>;
  duplicateTemplate(input: DuplicateTemplateInput): Promise<PageTemplate>;
  deleteTemplate(input: DeleteTemplateInput): Promise<boolean>;
}

export interface UseTemplatesOptions {
  readonly api?: TemplatesApi;
  readonly creatorId?: string;
  readonly initialCategory?: TemplateCategory | 'all';
  readonly initialScope?: TemplateScope;
  readonly autoLoad?: boolean;
}

export interface UseTemplatesResult {
  readonly templates: readonly PageTemplate[];
  readonly isLoading: boolean;
  readonly isSubmitting: boolean;
  readonly error: string | null;
  readonly activeFilter: {
    readonly creatorId?: string;
    readonly category?: TemplateCategory | 'all';
    readonly scope: TemplateScope;
  };
  loadTemplates(
    request?: Partial<TemplateListRequest> & { readonly category?: TemplateCategory | 'all' },
  ): Promise<void>;
  saveTemplateFromPage(input: SaveTemplateFromPageInput): Promise<PageTemplate | undefined>;
  duplicateTemplate(input: DuplicateTemplateInput): Promise<PageTemplate | undefined>;
  deleteTemplate(input: DeleteTemplateInput): Promise<boolean>;
}

export type UseTemplatesHook = (options?: UseTemplatesOptions) => UseTemplatesResult;

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  'store-page': 'Store Page',
  'product-page': 'Product Page',
  'landing-page': 'Landing Page',
};
