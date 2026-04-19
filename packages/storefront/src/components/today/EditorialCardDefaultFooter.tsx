/**
 * Purpose: Solid footer block for the default editorial card (split + square hero)
 * — title, byline, excerpt, tags on the primary surface.
 * Governing docs:
 *   - docs/architecture.md
 */
import { EditorialCardTagList } from './EditorialCardTagList';
import { formatEditorialCardDate } from './editorial-date-format';
import type { EditorialItem } from './today-types';

export interface EditorialCardDefaultFooterProps {
  readonly item: EditorialItem;
}

export function EditorialCardDefaultFooter({ item }: EditorialCardDefaultFooterProps) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 text-primary-foreground">
      <h3 className="text-balance text-lg font-semibold leading-snug line-clamp-3">{item.title}</h3>
      <p className="text-sm text-primary-foreground/85">
        {item.author} · {formatEditorialCardDate(item.publishedAt)}
      </p>
      <p
        data-testid="editorial-card-excerpt"
        className="line-clamp-2 text-sm text-primary-foreground/90"
      >
        {item.excerpt}
      </p>

      <EditorialCardTagList tags={item.tags} tone="on-primary" />
    </div>
  );
}
