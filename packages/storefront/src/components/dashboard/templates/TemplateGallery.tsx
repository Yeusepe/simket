/**
 * Purpose: Render template browsing cards, category filters, and builder save-as-template actions.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/docs/react/components/card.mdx
 *   - https://heroui.com/docs/react/components/button.mdx
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/TemplateGallery.test.tsx
 */
import { useMemo, useState } from 'react';
import { Button, Card, Input, Label } from '@heroui/react';
import type {
  PageTemplate,
  SaveTemplateFromPageInput,
  TemplateCategory,
} from './template-types';
import { TEMPLATE_CATEGORY_LABELS } from './template-types';

type TemplateCategoryFilter = TemplateCategory | 'all';

interface TemplateGalleryProps {
  readonly templates: readonly PageTemplate[];
  readonly isLoading?: boolean;
  readonly isSubmitting?: boolean;
  readonly error?: string | null;
  readonly currentPageId?: string;
  readonly onUseTemplate?: (template: PageTemplate) => void;
  readonly onDuplicateTemplate?: (template: PageTemplate) => Promise<void> | void;
  readonly onDeleteTemplate?: (template: PageTemplate) => Promise<void> | void;
  readonly onSaveAsTemplate?: (
    draft: Omit<SaveTemplateFromPageInput, 'pageId' | 'creatorId'>,
  ) => Promise<void> | void;
}

const CATEGORY_FILTERS: readonly TemplateCategoryFilter[] = [
  'all',
  'store-page',
  'product-page',
  'landing-page',
];

export function TemplateGallery({
  templates,
  isLoading = false,
  isSubmitting = false,
  error = null,
  currentPageId,
  onUseTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onSaveAsTemplate,
}: TemplateGalleryProps) {
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategoryFilter>('all');
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftThumbnail, setDraftThumbnail] = useState('');
  const [draftCategory, setDraftCategory] = useState<TemplateCategory>('store-page');

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) =>
        categoryFilter === 'all' ? true : template.category === categoryFilter,
      ),
    [categoryFilter, templates],
  );

  const handleSaveAsTemplate = async () => {
    if (!onSaveAsTemplate || draftName.trim().length === 0) {
      return;
    }

    try {
      await onSaveAsTemplate({
        name: draftName.trim(),
        description: draftDescription.trim() || undefined,
        thumbnail: draftThumbnail.trim() || undefined,
        category: draftCategory,
        isSystem: false,
      });
      setDraftName('');
      setDraftDescription('');
      setDraftThumbnail('');
      setDraftCategory('store-page');
    } catch {
      // Parent state renders the surfaced error.
    }
  };

  const canSaveTemplate = !!onSaveAsTemplate && !!currentPageId;

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <Card.Title>Template Gallery</Card.Title>
            <Card.Description>
              Browse starter layouts, apply them to the builder, or save the current page as a reusable template.
            </Card.Description>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={categoryFilter === filter ? 'secondary' : 'ghost'}
                onPress={() => setCategoryFilter(filter)}
              >
                {filter === 'all' ? 'All Templates' : TEMPLATE_CATEGORY_LABELS[filter]}
              </Button>
            ))}
          </div>
        </Card.Header>
        <Card.Content className="space-y-6">
          {onSaveAsTemplate ? (
            <Card variant="secondary">
              <Card.Header className="space-y-1">
                <Card.Title>Save current page</Card.Title>
                <Card.Description>
                  Turn the current builder page into a reusable template. Save-as-template requires a persisted page id.
                </Card.Description>
              </Card.Header>
              <Card.Content className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template name</Label>
                  <Input
                    id="template-name"
                    aria-label="Template name"
                    value={draftName}
                    onChange={(event) => setDraftName(event.currentTarget.value)}
                    placeholder="Creator landing page"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-thumbnail">Thumbnail URL</Label>
                  <Input
                    id="template-thumbnail"
                    aria-label="Template thumbnail URL"
                    value={draftThumbnail}
                    onChange={(event) => setDraftThumbnail(event.currentTarget.value)}
                    placeholder="https://cdn.example.com/template.png"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="template-description">Description</Label>
                  <Input
                    id="template-description"
                    aria-label="Template description"
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.currentTarget.value)}
                    placeholder="Reusable hero, social proof, and CTA stack."
                  />
                </div>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  {(['store-page', 'product-page', 'landing-page'] as const).map((category) => (
                    <Button
                      key={category}
                      size="sm"
                      variant={draftCategory === category ? 'secondary' : 'ghost'}
                      onPress={() => setDraftCategory(category)}
                    >
                      {TEMPLATE_CATEGORY_LABELS[category]}
                    </Button>
                  ))}
                </div>
              </Card.Content>
              <Card.Footer className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {canSaveTemplate
                    ? 'Ready to save the current builder page as a template.'
                    : 'Pass a current page id before saving personal templates.'}
                </p>
                <Button
                  isDisabled={!canSaveTemplate || draftName.trim().length === 0 || isSubmitting}
                  isPending={isSubmitting}
                  onPress={() => void handleSaveAsTemplate()}
                >
                  Save as Template
                </Button>
              </Card.Footer>
            </Card>
          ) : null}

          {error ? (
            <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {isLoading ? <p className="text-sm text-muted-foreground">Loading templates…</p> : null}

          {!isLoading && filteredTemplates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-default-300 px-6 py-12 text-center">
              <p className="text-lg font-medium">No templates found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust the category filter or save the current page as your first reusable template.
              </p>
            </div>
          ) : null}

          {!isLoading && filteredTemplates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="h-full">
                  {template.thumbnail ? (
                    <img
                      src={template.thumbnail}
                      alt={`${template.name} thumbnail`}
                      className="aspect-[4/3] w-full rounded-t-2xl object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-t-2xl bg-default-100 text-sm font-medium text-muted-foreground">
                      {TEMPLATE_CATEGORY_LABELS[template.category]}
                    </div>
                  )}
                  <Card.Header className="space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Card.Title>{template.name}</Card.Title>
                        <Card.Description>{TEMPLATE_CATEGORY_LABELS[template.category]}</Card.Description>
                      </div>
                      <span className="rounded-full bg-default-100 px-2 py-1 text-xs font-medium text-muted-foreground">
                        {template.isSystem ? 'System' : 'Saved'}
                      </span>
                    </div>
                  </Card.Header>
                  <Card.Content className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {template.description || 'No description provided for this template yet.'}
                    </p>
                    <p className="text-xs text-muted-foreground">Used {template.usageCount} times</p>
                  </Card.Content>
                  <Card.Footer className="flex flex-wrap gap-2">
                    <Button size="sm" onPress={() => onUseTemplate?.(template)}>
                      Use Template
                    </Button>
                    {onDuplicateTemplate ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled={isSubmitting}
                        onPress={() => void onDuplicateTemplate(template)}
                      >
                        Duplicate
                      </Button>
                    ) : null}
                    {!template.isSystem && onDeleteTemplate ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        isDisabled={isSubmitting}
                        onPress={() => void onDeleteTemplate(template)}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </Card.Footer>
                </Card>
              ))}
            </div>
          ) : null}
        </Card.Content>
      </Card>
    </div>
  );
}
