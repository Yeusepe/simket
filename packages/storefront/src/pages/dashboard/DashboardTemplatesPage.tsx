/**
 * Purpose: Route-level creator page builder for persisted store-home and
 *          product-detail Framely pages, plus template re-use workflows.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin, §7 HeroUI everywhere, §12 source of truth)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2 Vendure plugin contracts)
 *   - docs/domain-model.md (§1 Core records, StorePage, Storefront Template)
 * External references:
 *   - https://reactrouter.com/api/hooks/useSearchParams
 *   - https://docs.vendure.io/reference/graphql-api/shop/
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/TemplateGallery.test.tsx
 *   - packages/storefront/src/components/dashboard/templates/TemplatePicker.test.tsx
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from '@heroui/react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import {
  createDefaultProductPageSchema,
  createDefaultStoreHomePageSchema,
  createPageSchema,
  type PageSchema,
  useBuilder,
} from '../../builder';
import {
  TemplateBuilderStudio,
  TemplateGallery,
  TemplatePicker,
  useDashboardPreferences,
  useStorefrontPage,
  useTemplates,
  type EditableStorefrontPageTarget,
  type PageTemplate,
  type TemplateCategory,
} from '../../components/dashboard';
import { fetchCatalogProduct, fetchCreatorStore } from '../../services/catalog-api';

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

function getDefaultSchema(category: TemplateCategory): PageSchema {
  return category === 'product-page'
    ? createDefaultProductPageSchema()
    : createDefaultStoreHomePageSchema();
}

export function DashboardTemplatesPage() {
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { preferences, setPreviewDevice, setPreviewMode } = useDashboardPreferences();
  const creatorId = searchParams.get('creatorId') ?? session?.user.id ?? undefined;
  const creatorSlug = session?.user.creatorSlug ?? undefined;
  const requestedScope = searchParams.get('scope');
  const productId = searchParams.get('productId') ?? undefined;
  const productName = searchParams.get('productName') ?? 'Product';
  const productSlug = searchParams.get('productSlug') ?? undefined;
  const currentPageCategory =
    requestedScope === 'product'
      ? 'product-page'
      : parseTemplateCategory(searchParams.get('category'));
  const defaultSchema = useMemo(
    () => getDefaultSchema(currentPageCategory),
    [currentPageCategory],
  );
  const builder = useBuilder(defaultSchema);
  const [previewStore, setPreviewStore] = useState<Record<string, unknown> | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Record<string, unknown> | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [appliedPageKey, setAppliedPageKey] = useState<string | null>(null);
  const target = useMemo<EditableStorefrontPageTarget | null>(() => {
    if (currentPageCategory === 'product-page') {
      if (!productId) {
        return null;
      }

      return {
        scope: 'product',
        slug: 'product-detail',
        title: `${productName} product page`,
        productId,
      };
    }

    return {
      scope: 'universal',
      slug: 'home',
      title: 'Store home page',
    };
  }, [currentPageCategory, productId, productName]);
  const {
    page,
    isLoading: isPageLoading,
    isSaving,
    error: pageError,
    savePage,
  } = useStorefrontPage({
    target,
    autoLoad: Boolean(target),
  });
  const {
    templates,
    isLoading,
    isSubmitting,
    error,
    saveTemplateFromPage,
    duplicateTemplate,
    deleteTemplate,
  } = useTemplates({
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
      page
        ? [
            {
              id: page.id,
              name: target?.title ?? 'Current Page',
              category: currentPageCategory,
              schema: builder.schema,
              updatedAt: page.updatedAt,
            },
          ]
        : [],
    [builder.schema, currentPageCategory, page, target?.title],
  );
  const previewContext = useMemo(() => {
    const productHref = (productHrefSlug: string) =>
      creatorSlug
        ? `/store/${creatorSlug}/product/${productHrefSlug}`
        : `/product/${productHrefSlug}`;

    return {
      kind: 'preview' as const,
      store: previewStore ?? undefined,
      product: previewProduct ?? undefined,
      hrefs: {
        home: creatorSlug ? `/store/${creatorSlug}` : '/store',
        page: (pageSlug: string) => (creatorSlug ? `/store/${creatorSlug}/${pageSlug}` : `/${pageSlug}`),
        product: productHref,
      },
    };
  }, [creatorSlug, previewProduct, previewStore]);
  const surfaceTitle = currentPageCategory === 'product-page'
    ? `${productName} product page`
    : 'Store home page';
  const surfaceDescription = currentPageCategory === 'product-page'
    ? 'Compose the live product detail experience with Framely blocks and save it to the creator-owned product page slot.'
    : 'Compose the public creator storefront homepage with Framely blocks and save it to the creator-owned store home page slot.';
  const combinedError = pageError ?? previewError ?? error;

  useEffect(() => {
    if (!target || isPageLoading) {
      return;
    }

    const nextKey = `${target.scope}:${target.productId ?? 'store'}:${page?.id ?? 'draft'}:${page?.updatedAt ?? 'draft'}`;
    if (appliedPageKey === nextKey) {
      return;
    }

    const nextSchema = page?.schema
      ? (page.schema as unknown as PageSchema)
      : defaultSchema;
    builder.actions.replaceSchema(nextSchema);
    setAppliedPageKey(nextKey);
  }, [appliedPageKey, builder.actions, defaultSchema, isPageLoading, page, target]);

  useEffect(() => {
    let cancelled = false;

    setPreviewError(null);
    setPreviewStore(null);
    setPreviewProduct(null);

    if (currentPageCategory === 'store-page') {
      if (!creatorSlug) {
        return () => {
          cancelled = true;
        };
      }

      void fetchCreatorStore(creatorSlug)
        .then((store) => {
          if (!cancelled) {
            setPreviewStore(store as unknown as Record<string, unknown> | null);
          }
        })
        .catch((nextError) => {
          if (!cancelled) {
            setPreviewError(nextError instanceof Error ? nextError.message : 'Unable to load store preview.');
          }
        });

      return () => {
        cancelled = true;
      };
    }

    if (!productSlug) {
      return () => {
        cancelled = true;
      };
    }

    void fetchCatalogProduct(productSlug)
      .then((product) => {
        if (!cancelled) {
          setPreviewProduct(product as unknown as Record<string, unknown>);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setPreviewError(nextError instanceof Error ? nextError.message : 'Unable to load product preview.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [creatorSlug, currentPageCategory, productSlug]);

  async function handleSavePage() {
    if (!target) {
      return;
    }

    const savedPage = await savePage({
      pageId: page?.id,
      title: target.title,
      slug: target.slug,
      scope: target.scope,
      productId: target.productId,
      schema: builder.schema,
      enabled: true,
    });

    if (savedPage) {
      setAppliedPageKey(
        `${target.scope}:${target.productId ?? 'store'}:${savedPage.id}:${savedPage.updatedAt}`,
      );
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border border-border/70 bg-surface/95">
        <Card.Header className="space-y-1">
          <Card.Title>{surfaceTitle}</Card.Title>
          <Card.Description>
            {surfaceDescription}
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-3 text-sm text-muted-foreground">
          {!target ? (
            <p>
              Product page editing requires a valid <code>?productId=</code> query parameter. Open this editor from the Products dashboard to target a specific product page.
            </p>
          ) : null}
          {!creatorId ? (
            <p>
              Personal templates require an authenticated creator session. System templates remain browseable without it.
            </p>
          ) : null}
          {page ? (
            <p>
              Editing persisted page <code>{page.slug}</code>. Last saved {new Date(page.updatedAt).toLocaleString()}.
            </p>
          ) : (
            <p>
              No persisted page exists yet for this surface. Saving will create one using the default Framely slot for this route.
            </p>
          )}
        </Card.Content>
        <Card.Footer className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" isDisabled={!target || isSaving} onPress={() => void handleSavePage()}>
              {isSaving ? 'Saving…' : 'Save Page'}
            </Button>
            <Button variant="ghost" onPress={() => builder.actions.replaceSchema(defaultSchema)}>
              Reset to Default
            </Button>
          </div>
          <TemplatePicker
            systemTemplates={systemTemplates}
            personalTemplates={personalTemplates}
            existingPages={existingPages}
            onStartFromScratch={() => builder.actions.replaceSchema(defaultSchema)}
            onUseTemplate={(template) => applyTemplateToBuilder(builder.actions, template)}
            onDuplicatePage={(existingPage) => builder.actions.replaceSchema(existingPage.schema)}
          />
        </Card.Footer>
      </Card>

      <TemplateGallery
        templates={templates}
        isLoading={isLoading}
        isSubmitting={isSubmitting || isSaving}
        error={combinedError}
        currentPageId={page?.id}
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
          creatorId && page
            ? async (draft) => {
                await saveTemplateFromPage({
                  pageId: page.id,
                  creatorId,
                  ...draft,
                });
              }
            : undefined
        }
      />

      <TemplateBuilderStudio
        builder={builder}
        surfaceLabel={surfaceTitle}
        surfaceCategory={currentPageCategory}
        previewContext={previewContext}
        previewDevice={preferences.previewDevice}
        previewMode={preferences.previewMode}
        onPreviewDeviceChange={setPreviewDevice}
        onPreviewModeChange={setPreviewMode}
      />
    </div>
  );
}
