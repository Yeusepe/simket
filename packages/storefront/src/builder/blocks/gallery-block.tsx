/**
 * Purpose: Render an image and video gallery section for creator storefront media.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 Asset, FramelyProject)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import { Card } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

export interface GalleryItem {
  readonly id: string;
  readonly src: string;
  readonly alt?: string;
  readonly type?: 'image' | 'video';
  readonly caption?: string;
}

export interface GalleryBlockProps {
  readonly heading?: string;
  readonly columns?: 2 | 3 | 4;
  readonly items?: readonly GalleryItem[];
  readonly children?: ReactNode;
}

export const galleryBlockDefinition: BlockDefinition = {
  type: 'gallery',
  label: 'Gallery',
  icon: 'image',
  defaultProps: {
    heading: 'Gallery',
    columns: 3,
    items: [
      { id: 'gallery-1', src: 'https://placehold.co/640x360?text=Preview+1', alt: 'Preview 1', type: 'image' },
      { id: 'gallery-2', src: 'https://placehold.co/640x360?text=Preview+2', alt: 'Preview 2', type: 'image' },
      { id: 'gallery-3', src: 'https://placehold.co/640x360?text=Preview+3', alt: 'Preview 3', type: 'image' },
    ],
  },
  propSchema: {
    fields: [
      { name: 'heading', type: 'text', label: 'Heading', required: false, defaultValue: 'Gallery' },
      { name: 'columns', type: 'select', label: 'Columns', required: true, defaultValue: 3, options: ['2', '3', '4'] },
    ],
  },
};

export function GalleryBlock({
  heading = 'Gallery',
  columns = 3,
  items = galleryBlockDefinition.defaultProps.items as readonly GalleryItem[],
  children,
}: GalleryBlockProps) {
  const gridClass =
    columns === 4
      ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4'
      : columns === 2
        ? 'grid gap-4 md:grid-cols-2'
        : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3';

  return (
    <section className="space-y-5">
      {heading ? <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2> : null}
      <div className={gridClass}>
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden rounded-[var(--builder-border-radius,1.5rem)]">
            <Card.Content className="p-0">
              {item.type === 'video' ? (
                <video
                  aria-label={item.alt ?? heading}
                  className="aspect-video w-full object-cover"
                  controls
                  src={item.src}
                />
              ) : (
                <img
                  alt={item.alt ?? heading}
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                  src={item.src}
                />
              )}
            </Card.Content>
            {item.caption ? (
              <Card.Footer>
                <span className="text-sm text-muted">{item.caption}</span>
              </Card.Footer>
            ) : null}
          </Card>
        ))}
      </div>
      {children}
    </section>
  );
}
