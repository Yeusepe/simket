/**
 * Purpose: Tag chips for editorial cards — shared between split footer and compact body.
 * Governing docs:
 *   - docs/architecture.md
 */
import { Chip } from '@heroui/react';

export interface EditorialCardTagListProps {
  readonly tags: readonly string[];
  /** Chips on primary footer vs default card surface. */
  readonly tone: 'on-primary' | 'surface';
  /** Tighter wrapping for small compact tiles. */
  readonly density?: 'compact' | 'default';
}

export function EditorialCardTagList({ tags, tone, density = 'default' }: EditorialCardTagListProps) {
  if (tags.length === 0) {
    return null;
  }

  const wrapClass =
    density === 'compact'
      ? 'flex max-h-12 flex-wrap gap-1.5 overflow-hidden'
      : 'flex flex-wrap gap-2';

  const chipClassName =
    tone === 'on-primary'
      ? 'border border-white/15 bg-white/10 text-primary-foreground'
      : undefined;

  return (
    <div className={wrapClass}>
      {tags.map((tag) => (
        <Chip key={tag} size="sm" variant="soft" className={chipClassName}>
          <Chip.Label>{tag}</Chip.Label>
        </Chip>
      ))}
    </div>
  );
}
