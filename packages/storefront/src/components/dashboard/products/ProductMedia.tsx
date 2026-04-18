/**
 * Purpose: Creator product media section that reuses the shared asset uploader and previews selected assets.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/ProductMedia.test.tsx
 */
import { useState, type ComponentType } from 'react';
import { Button, Card } from '@heroui/react';
import { AssetUploader, type AssetUploaderProps } from '../../AssetUploader';
import type { UploadConfig } from '../../../services/upload-service';
import type { ProductFormData, ProductMediaPreviewMap } from './product-types';

interface ProductMediaProps {
  readonly heroImageId?: string;
  readonly heroTransparentId?: string;
  readonly galleryImageIds: readonly string[];
  readonly imageUrlsById?: ProductMediaPreviewMap;
  readonly uploaderConfig: UploadConfig;
  readonly onChange?: (patch: Partial<ProductFormData>) => void;
  readonly AssetUploaderComponent?: ComponentType<AssetUploaderProps>;
}

function reorderGallery(ids: readonly string[], fromId: string, toId: string): readonly string[] {
  const fromIndex = ids.indexOf(fromId);
  const toIndex = ids.indexOf(toId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return ids;
  }

  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function PreviewImage({
  alt,
  src,
}: {
  readonly alt: string;
  readonly src?: string;
}) {
  if (!src) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-default-300 bg-default-50 text-sm text-muted-foreground">
        No image selected yet.
      </div>
    );
  }

  return <img src={src} alt={alt} className="h-40 w-full rounded-2xl object-cover" />;
}

export function ProductMedia({
  heroImageId,
  heroTransparentId,
  galleryImageIds,
  imageUrlsById = {},
  uploaderConfig,
  onChange,
  AssetUploaderComponent = AssetUploader,
}: ProductMediaProps) {
  const [draggedGalleryId, setDraggedGalleryId] = useState<string | null>(null);

  return (
    <Card variant="secondary">
      <Card.Header className="space-y-1">
        <Card.Title>Media</Card.Title>
        <Card.Description>
          Upload a hero asset, an optional transparent cut-out, and gallery images for richer previews.
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <div className="space-y-1">
              <h3 className="font-semibold">Hero image</h3>
              <p className="text-sm text-muted-foreground">
                Recommended 1600×900 WebP or PNG. This is the primary product thumbnail.
              </p>
            </div>
            <PreviewImage alt="Hero preview" src={heroImageId ? imageUrlsById[heroImageId] : undefined} />
            <AssetUploaderComponent config={uploaderConfig} />
            {heroImageId ? (
              <Button variant="ghost" onPress={() => onChange?.({ heroImageId: undefined })}>
                Remove hero image
              </Button>
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="space-y-1">
              <h3 className="font-semibold">Transparent hero image</h3>
              <p className="text-sm text-muted-foreground">
                Optional PNG with transparency for layered page-builder treatments.
              </p>
            </div>
            <PreviewImage
              alt="Transparent hero preview"
              src={heroTransparentId ? imageUrlsById[heroTransparentId] : undefined}
            />
            <AssetUploaderComponent config={uploaderConfig} />
            {heroTransparentId ? (
              <Button variant="ghost" onPress={() => onChange?.({ heroTransparentId: undefined })}>
                Remove transparent hero image
              </Button>
            ) : null}
          </section>
        </div>

        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="font-semibold">Gallery images</h3>
            <p className="text-sm text-muted-foreground">
              Upload secondary images in WebP or PNG. Drag thumbnails to reorder gallery presentation.
            </p>
          </div>
          <AssetUploaderComponent config={uploaderConfig} />

          {galleryImageIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gallery images selected yet.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {galleryImageIds.map((assetId, index) => (
                <li
                  key={assetId}
                  draggable
                  onDragStart={() => setDraggedGalleryId(assetId)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggedGalleryId) {
                      return;
                    }

                    onChange?.({
                      galleryImageIds: reorderGallery(galleryImageIds, draggedGalleryId, assetId),
                    });
                    setDraggedGalleryId(null);
                  }}
                  className="space-y-3 rounded-2xl border border-default-200 p-3"
                >
                  <PreviewImage
                    alt={`Gallery preview ${index + 1}`}
                    src={imageUrlsById[assetId]}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">Gallery image {index + 1}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onPress={() =>
                          onChange?.({
                            galleryImageIds: galleryImageIds.filter((currentId) => currentId !== assetId),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Card.Content>
    </Card>
  );
}
