/**
 * Purpose: Compact square editorial tiles (bento grid picks) — image + Card header/content.
 * Governing docs:
 *   - docs/architecture.md
 */
import { Card } from '@heroui/react';

import { EditorialCardHeroImage } from './EditorialCardHeroImage';
import { EditorialCardTagList } from './EditorialCardTagList';
import { EDITORIAL_CARD_SHELL_CLASSNAME } from './editorial-card-types';
import { formatEditorialCardDate } from './editorial-date-format';
import { getEditorialStoryHref } from './editorial-links';
import type { EditorialItem } from './today-types';

export interface EditorialCardCompactProps {
  readonly item: EditorialItem;
  readonly size: 'small' | 'medium';
}

export function EditorialCardCompact({ item, size }: EditorialCardCompactProps) {
  const titleClass =
    size === 'small' ? 'text-sm font-semibold leading-snug' : 'text-base';
  const descClass = size === 'small' ? 'text-xs' : 'text-sm';
  const excerptSize = size === 'small' ? 'text-xs' : 'text-sm';
  const accent = item.previewColor ?? null;
  const accentBorder = accent ? 'border-l-4 border-solid' : '';

  return (
    <a
      href={getEditorialStoryHref(item.slug)}
      aria-label={item.title}
      className="block h-full min-h-0 focus-visible:outline-none"
    >
      <Card
        role="article"
        data-testid="editorial-card"
        data-editorial-size={size}
        className={`flex aspect-square flex-col ${EDITORIAL_CARD_SHELL_CLASSNAME} ${accentBorder}`}
        style={accent ? { borderLeftColor: accent } : undefined}
      >
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <EditorialCardHeroImage
            item={item}
            variant="compact"
            compactDensity={size === 'small' ? 'small' : 'medium'}
          />
        </div>

        <Card.Header
          className={`flex flex-col gap-1 pb-1 ${
            size === 'small' ? 'shrink-0 px-3 pt-2' : 'shrink-0 px-4 pt-3'
          }`}
        >
          <Card.Title className={`${titleClass} line-clamp-2`}>{item.title}</Card.Title>
          <Card.Description className={`${descClass} text-default-500`}>
            {item.author} · {formatEditorialCardDate(item.publishedAt)}
          </Card.Description>
        </Card.Header>

        <Card.Content
          className={`flex flex-1 flex-col pt-0 ${
            size === 'small' ? 'gap-2 px-3 pb-3' : 'gap-3 px-4 pb-4'
          }`}
        >
          <p
            data-testid="editorial-card-excerpt"
            className={`line-clamp-2 ${excerptSize} text-default-600`}
          >
            {item.excerpt}
          </p>

          <EditorialCardTagList
            tags={item.tags}
            tone="surface"
            density={size === 'small' ? 'compact' : 'default'}
          />
        </Card.Content>
      </Card>
    </a>
  );
}
