/**
 * Purpose: Default editorial card — square hero + primary footer (horizontal scroll, etc.).
 * Governing docs:
 *   - docs/architecture.md
 */
import { Card } from '@heroui/react';

import { EditorialCardDefaultFooter } from './EditorialCardDefaultFooter';
import { EditorialCardHeroImage } from './EditorialCardHeroImage';
import { EDITORIAL_CARD_SHELL_CLASSNAME } from './editorial-card-types';
import { getEditorialStoryHref } from './editorial-links';
import { SplitMediaCard } from './SplitMediaCard';
import type { EditorialItem } from './today-types';

export interface EditorialCardSplitProps {
  readonly item: EditorialItem;
}

export function EditorialCardSplit({ item }: EditorialCardSplitProps) {
  return (
    <a
      href={getEditorialStoryHref(item.slug)}
      aria-label={item.title}
      className="block h-full min-h-0 focus-visible:outline-none"
    >
      <Card
        role="article"
        data-testid="editorial-card"
        data-editorial-size="default"
        className={`flex flex-col ${EDITORIAL_CARD_SHELL_CLASSNAME}`}
      >
        <SplitMediaCard
          className="min-h-0 flex-1"
          footerClassName="min-w-0 bg-primary"
          media={<EditorialCardHeroImage item={item} variant="square" />}
          footer={<EditorialCardDefaultFooter item={item} />}
        />
      </Card>
    </a>
  );
}
