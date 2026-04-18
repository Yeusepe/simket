/**
 * Purpose: Creator product form that composes basic info, TipTap fields, pricing, media, and settings.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/ProductForm.test.tsx
 */
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Button, Card, Input, Label } from '@heroui/react';
import { TipTapEditor, type TipTapEditorProps } from '../../TipTapEditor';
import { ProductMedia } from './ProductMedia';
import { ProductPricing } from './ProductPricing';
import { ProductSettings } from './ProductSettings';
import type { AssetUploaderProps } from '../../AssetUploader';
import type { UploadConfig } from '../../../services/upload-service';
import type { ProductFormData, ProductFormErrors, ProductMediaPreviewMap } from './product-types';
import { generateSlug, validateProductForm } from './use-products';

interface ProductFormProps {
  readonly initialData?: Partial<ProductFormData>;
  readonly imageUrlsById?: ProductMediaPreviewMap;
  readonly availableTags?: readonly string[];
  readonly uploaderConfig: UploadConfig;
  readonly isSaving?: boolean;
  readonly onSave: (data: ProductFormData) => Promise<void> | void;
  readonly onCancel?: () => void;
  readonly AssetUploaderComponent?: ComponentType<AssetUploaderProps>;
  readonly RichTextEditorComponent?: ComponentType<TipTapEditorProps>;
}

const EMPTY_RICH_TEXT = JSON.stringify({ type: 'doc', content: [] });

function buildInitialData(initialData?: Partial<ProductFormData>): ProductFormData {
  return {
    name: '',
    slug: '',
    description: EMPTY_RICH_TEXT,
    shortDescription: '',
    price: 0,
    compareAtPrice: undefined,
    currency: 'USD',
    platformFeePercent: 5,
    tags: [],
    heroImageId: undefined,
    heroTransparentId: undefined,
    galleryImageIds: [],
    termsOfService: EMPTY_RICH_TEXT,
    visibility: 'draft',
    ...initialData,
  };
}

function parseRichTextContent(content: string): TipTapEditorProps['content'] {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

export function ProductForm({
  initialData,
  imageUrlsById,
  availableTags,
  uploaderConfig,
  isSaving = false,
  onSave,
  onCancel,
  AssetUploaderComponent,
  RichTextEditorComponent = TipTapEditor,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(() => buildInitialData(initialData));
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [isPersisting, setIsPersisting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasManualSlug, setHasManualSlug] = useState(Boolean(initialData?.slug));

  const initialSnapshot = useMemo(() => JSON.stringify(buildInitialData(initialData)), [initialData]);
  const isDirty = JSON.stringify(formData) !== initialSnapshot;

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const patchForm = (patch: Partial<ProductFormData>) => {
    setFormData((current) => ({ ...current, ...patch }));
    setErrors((current) => ({ ...current, ...Object.fromEntries(Object.keys(patch).map((key) => [key, undefined])) }));
  };

  const handleNameChange = (value: string) => {
    setFormData((current) => {
      const nextSlug = hasManualSlug ? current.slug : generateSlug(value);
      return {
        ...current,
        name: value,
        slug: nextSlug,
      };
    });
    setErrors((current) => ({ ...current, name: undefined, slug: undefined }));
  };

  const handleSave = async (visibility: ProductFormData['visibility']) => {
    const payload: ProductFormData = {
      ...formData,
      visibility,
    };
    const validationErrors = validateProductForm(payload);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaveError(null);
    setIsPersisting(true);

    try {
      await onSave(payload);
      setFormData(payload);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsPersisting(false);
    }
  };

  const isSubmitDisabled = isSaving || isPersisting;

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <Card.Title>{initialData ? 'Edit product' : 'Create product'}</Card.Title>
            <Card.Description>
              Craft storefront copy, configure pricing, upload media, and control publishing settings.
            </Card.Description>
          </div>
          <div className="flex flex-wrap gap-2">
            {onCancel ? (
              <Button variant="ghost" onPress={onCancel}>
                Cancel
              </Button>
            ) : null}
            <Button variant="secondary" isDisabled={isSubmitDisabled} onPress={() => void handleSave('draft')}>
              Save draft
            </Button>
            <Button isDisabled={isSubmitDisabled} isPending={isSubmitDisabled} onPress={() => void handleSave('published')}>
              Publish
            </Button>
          </div>
        </Card.Header>
        <Card.Content className="space-y-6">
          {isDirty ? (
            <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              You have unsaved changes.
            </div>
          ) : null}
          {saveError ? (
            <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {saveError}
            </div>
          ) : null}

          <Card variant="secondary">
            <Card.Header className="space-y-1">
              <Card.Title>Basic info</Card.Title>
              <Card.Description>Name, generated slug, and a concise summary for list views.</Card.Description>
            </Card.Header>
            <Card.Content className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product-name">Product name</Label>
                <Input
                  id="product-name"
                  aria-label="Product name"
                  value={formData.name}
                  onChange={(event) => handleNameChange(event.currentTarget.value)}
                />
                {errors.name ? <p className="text-sm text-danger">{errors.name}</p> : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product-short-description">Short description</Label>
                <Input
                  id="product-short-description"
                  aria-label="Short description"
                  value={formData.shortDescription}
                  onChange={(event) => patchForm({ shortDescription: event.currentTarget.value })}
                />
                {errors.shortDescription ? (
                  <p className="text-sm text-danger">{errors.shortDescription}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Current slug: /product/{formData.slug || 'your-product'}</p>
                )}
              </div>
            </Card.Content>
          </Card>

          <Card variant="secondary">
            <Card.Header className="space-y-1">
              <Card.Title>Description</Card.Title>
              <Card.Description>Use TipTap content for the full storefront sales page body.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-2">
              <RichTextEditorComponent
                content={parseRichTextContent(formData.description)}
                placeholder="Product description"
                onChange={(json) => patchForm({ description: JSON.stringify(json) })}
              />
              {errors.description ? <p className="text-sm text-danger">{errors.description}</p> : null}
            </Card.Content>
          </Card>

          <ProductPricing
            data={formData}
            errors={errors}
            onChange={patchForm}
          />

          <ProductMedia
            heroImageId={formData.heroImageId}
            heroTransparentId={formData.heroTransparentId}
            galleryImageIds={formData.galleryImageIds}
            imageUrlsById={imageUrlsById}
            uploaderConfig={uploaderConfig}
            onChange={patchForm}
            AssetUploaderComponent={AssetUploaderComponent}
          />

          <ProductSettings
            slug={formData.slug}
            visibility={formData.visibility}
            tags={formData.tags}
            termsOfService={formData.termsOfService}
            availableTags={availableTags}
            errors={errors}
            onChange={(patch) => {
              if (typeof patch.slug === 'string') {
                setHasManualSlug(true);
              }
              patchForm(patch);
            }}
            RichTextEditorComponent={RichTextEditorComponent}
          />
        </Card.Content>
      </Card>
    </div>
  );
}
