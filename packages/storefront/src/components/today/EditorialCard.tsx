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
  /** `small` = square tile (bento picks); `medium` = square tile with roomier type; `default` = standard card. */
  readonly size?: 'default' | 'small' | 'medium';
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

export function EditorialCard({ item, size = 'default' }: EditorialCardProps) {
  const isCompact = size === 'small' || size === 'medium';
  const titleClass =
    size === 'small' ? 'text-sm font-semibold leading-snug' : size === 'medium' ? 'text-base' : 'text-lg';
  const descClass = size === 'small' ? 'text-xs' : 'text-sm';
  const excerptSize = size === 'small' ? 'text-xs' : 'text-sm';

  return (
    <a
      href={getEditorialHref(item.slug)}
      aria-label={item.title}
      className="block h-full min-h-0 focus-visible:outline-none"
    >
      <Card
        role="article"
        data-testid="editorial-card"
        data-editorial-size={size}
        className={`h-full min-h-0 overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary ${
          isCompact ? 'flex aspect-square flex-col' : ''
        }`}
      >
        <div
          className={
            isCompact
              ? 'relative min-h-0 flex-1 overflow-hidden bg-content2'
              : 'relative aspect-[4/3] overflow-hidden bg-content2'
          }
        >
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
                className={
                  size === 'small'
                    ? 'absolute inset-x-4 bottom-0 top-2 h-[calc(100%-0.5rem)] w-[calc(100%-2rem)] object-contain drop-shadow-xl'
                    : 'absolute inset-x-6 bottom-0 top-4 h-[calc(100%-1rem)] w-[calc(100%-3rem)] object-contain drop-shadow-2xl'
                }
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

        <Card.Header
          className={`flex flex-col gap-1 pb-1 ${
            size === 'small'
              ? 'shrink-0 px-3 pt-2'
              : size === 'medium'
                ? 'shrink-0 px-4 pt-3'
                : 'gap-2 pb-2'
          }`}
        >
          <Card.Title className={`${titleClass} ${isCompact ? 'line-clamp-2' : ''}`}>{item.title}</Card.Title>
          <Card.Description className={`${descClass} text-default-500`}>
            {item.author} · {formatPublishedDate(item.publishedAt)}
          </Card.Description>
        </Card.Header>

        <Card.Content
          className={`flex flex-1 flex-col pt-0 ${
            size === 'small'
              ? 'gap-2 px-3 pb-3'
              : size === 'medium'
                ? 'gap-3 px-4 pb-4'
                : 'gap-4'
          }`}
        >
          <p
            data-testid="editorial-card-excerpt"
            className={`line-clamp-2 ${excerptSize} text-default-600`}
          >
            {item.excerpt}
          </p>

          {item.tags.length > 0 && (
            <div
              className={`flex flex-wrap ${size === 'small' ? 'max-h-12 gap-1.5 overflow-hidden' : 'gap-2'}`}
            >
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
