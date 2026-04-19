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
import { EditorialCardCompact } from './EditorialCardCompact';
import { EditorialCardSplit } from './EditorialCardSplit';
import type { EditorialCardProps } from './editorial-card-types';

export type { EditorialCardProps } from './editorial-card-types';

export function EditorialCard({ item, size = 'default' }: EditorialCardProps) {
  if (size === 'small' || size === 'medium') {
    return <EditorialCardCompact item={item} size={size} />;
  }

  return <EditorialCardSplit item={item} />;
}
