/**
 * Purpose: Export surface for creator template management components, hooks, and shared contracts.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/use-templates.test.ts
 *   - packages/storefront/src/components/dashboard/templates/TemplateGallery.test.tsx
 *   - packages/storefront/src/components/dashboard/templates/TemplatePicker.test.tsx
 */
export { TemplateGallery } from './TemplateGallery';
export { TemplateBuilderStudio } from './TemplateBuilderStudio';
export { TemplatePicker } from './TemplatePicker';
export { useStorefrontPage } from './use-storefront-pages';
export { createTemplatesApi, useTemplates } from './use-templates';
export type {
  DeleteTemplateInput,
  DuplicateTemplateInput,
  PageTemplate,
  SaveTemplateFromPageInput,
  TemplateCategory,
  TemplateListRequest,
  TemplatePageSource,
  TemplateScope,
  TemplatesApi,
  UseTemplatesHook,
  UseTemplatesOptions,
  UseTemplatesResult,
} from './template-types';
export type {
  CreatorStorefrontPageApi,
  CreatorStorefrontPageRecord,
  EditableStorefrontPageTarget,
  StorefrontPageScope,
  UpsertCreatorStorefrontPageInput,
  UseStorefrontPageOptions,
} from './use-storefront-pages';
export { TEMPLATE_CATEGORY_LABELS } from './template-types';
