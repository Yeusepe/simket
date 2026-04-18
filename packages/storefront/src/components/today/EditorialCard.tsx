/**
 * Purpose: Render a single editorial card with compound HeroUI primitives,
 * metadata, and optional layered hero artwork.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/chip
 * Tests:
 *   - packages/storefront/src/components/today/EditorialCard.test.tsx
 */
import { Card, Chip } from '@heroui/react';
import type { EditorialItem } from './today-types';

interface EditorialCardProps {
  readonly item: EditorialItem;
}

function formatPublishedDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getEditorialHref(slug: string): string {
  return `/editorial/${slug}`;
}

export function EditorialCard({ item }: EditorialCardProps) {
  return (
    <a
      href={getEditorialHref(item.slug)}
      aria-label={item.title}
      className="block focus-visible:outline-none"
    >
      <Card
        role="article"
        data-testid="editorial-card"
        className="h-full overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-content2">
          {item.heroTransparent ? (
            <>
              <img
                src={item.heroImage}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover opacity-35"
                loading="lazy"
              />
              <img
                data-testid="editorial-card-depth-image"
                src={item.heroTransparent}
                alt=""
                aria-hidden="true"
                className="absolute inset-x-6 bottom-0 top-4 h-[calc(100%-1rem)] w-[calc(100%-3rem)] object-contain drop-shadow-2xl"
                loading="lazy"
              />
            </>
          ) : (
            <img
              src={item.heroImage}
              alt={item.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </div>

        <Card.Header className="flex flex-col gap-2 pb-2">
          <Card.Title className="text-lg">{item.title}</Card.Title>
          <Card.Description className="text-sm text-default-500">
            {item.author} · {formatPublishedDate(item.publishedAt)}
          </Card.Description>
        </Card.Header>

        <Card.Content className="flex flex-1 flex-col gap-4 pt-0">
          <p data-testid="editorial-card-excerpt" className="line-clamp-2 text-sm text-default-600">
            {item.excerpt}
          </p>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Chip key={tag} size="sm" variant="soft">
                  <Chip.Label>{tag}</Chip.Label>
                </Chip>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>
    </a>
  );
}
