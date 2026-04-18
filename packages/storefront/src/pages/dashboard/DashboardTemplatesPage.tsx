/**
 * Purpose: Route-level creator template management workspace with picker, gallery, and builder preview.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 *   - docs/domain-model.md (§1 Core records, Storefront Template)
 * External references:
 *   - https://reactrouter.com/api/hooks/useSearchParams
 *   - https://heroui.com/docs/react/components/card.mdx
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/TemplateGallery.test.tsx
 *   - packages/storefront/src/components/dashboard/templates/TemplatePicker.test.tsx
 */
import { useMemo } from 'react';
import { Button, Card } from '@heroui/react';
import { useSearchParams } from 'react-router-dom';
import { PageRenderer, createPageSchema, useBuilder } from '../../builder';
import {
  TemplateGallery,
  TemplatePicker,
  useTemplates,
  type PageTemplate,
  type TemplateCategory,
} from '../../components/dashboard';

function applyTemplateToBuilder(
  actions: ReturnType<typeof useBuilder>['actions'],
  template: Pick<PageTemplate, 'blocks'>,
) {
  actions.replaceSchema(
    createPageSchema({
      blocks: template.blocks,
    }),
  );
}

function parseTemplateCategory(value: string | null): TemplateCategory {
  return value === 'landing-page' || value === 'product-page' || value === 'store-page'
    ? value
    : 'store-page';
}

export function DashboardTemplatesPage() {
  const [searchParams] = useSearchParams();
  const creatorId = searchParams.get('creatorId') ?? undefined;
  const currentPageId = searchParams.get('pageId') ?? undefined;
  const currentPageName = searchParams.get('pageName') ?? 'Current Page';
  const currentPageCategory = parseTemplateCategory(searchParams.get('category'));
  const builder = useBuilder();
  const { templates, isLoading, isSubmitting, error, saveTemplateFromPage, duplicateTemplate, deleteTemplate } =
    useTemplates({
      creatorId,
      autoLoad: true,
    });

  const systemTemplates = useMemo(
    () => templates.filter((template) => template.isSystem),
    [templates],
  );
  const personalTemplates = useMemo(
    () => templates.filter((template) => !template.isSystem),
    [templates],
  );
  const existingPages = useMemo(
    () =>
      currentPageId
        ? [
            {
              id: currentPageId,
              name: currentPageName,
              category: currentPageCategory,
              schema: builder.schema,
              updatedAt: new Date().toISOString(),
            },
          ]
        : [],
    [builder.schema, currentPageCategory, currentPageId, currentPageName],
  );

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header className="space-y-1">
          <Card.Title>Template Management</Card.Title>
          <Card.Description>
            Save builder layouts, browse system starters, and duplicate creator-owned page patterns.
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-3 text-sm text-muted-foreground">
          {!creatorId ? (
            <p>
              Personal template mutations require a <code>?creatorId=</code> query parameter. System templates remain browseable without it.
            </p>
          ) : null}
          {!currentPageId ? (
            <p>
              Save-as-template also requires a persisted page id via <code>?pageId=</code>.
            </p>
          ) : null}
        </Card.Content>
        <Card.Footer>
          <TemplatePicker
            systemTemplates={systemTemplates}
            personalTemplates={personalTemplates}
            existingPages={existingPages}
            onStartFromScratch={() => builder.actions.replaceSchema(createPageSchema())}
            onUseTemplate={(template) => applyTemplateToBuilder(builder.actions, template)}
            onDuplicatePage={(page) => builder.actions.replaceSchema(page.schema)}
          />
        </Card.Footer>
      </Card>

      <TemplateGallery
        templates={templates}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        error={error}
        currentPageId={currentPageId}
        onUseTemplate={(template) => applyTemplateToBuilder(builder.actions, template)}
        onDuplicateTemplate={
          creatorId
            ? async (template) => {
                await duplicateTemplate({
                  templateId: template.id,
                  creatorId,
                });
              }
            : undefined
        }
        onDeleteTemplate={
          creatorId
            ? async (template) => {
                await deleteTemplate({
                  templateId: template.id,
                  creatorId,
                });
              }
            : undefined
        }
        onSaveAsTemplate={
          creatorId && currentPageId
            ? async (draft) => {
                await saveTemplateFromPage({
                  pageId: currentPageId,
                  creatorId,
                  ...draft,
                });
              }
            : undefined
        }
      />

      <Card>
        <Card.Header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <Card.Title>Builder Preview</Card.Title>
            <Card.Description>
              Apply a template, start from scratch, or seed the canvas with a few starter blocks.
            </Card.Description>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onPress={() => builder.actions.addBlock('hero')}>
              Add Hero
            </Button>
            <Button variant="ghost" onPress={() => builder.actions.addBlock('text')}>
              Add Text
            </Button>
            <Button variant="ghost" onPress={() => builder.actions.addBlock('button')}>
              Add Button
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          {builder.schema.blocks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-default-300 px-6 py-12 text-center">
              <p className="text-lg font-medium">No blocks on the canvas yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a template above or add starter blocks to begin composing the page.
              </p>
            </div>
          ) : (
            <PageRenderer schema={builder.schema} />
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
