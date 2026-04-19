/**
 * Purpose: Render Today editorial cards in responsive two-column or four-column
 * grids.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/today/EditorialCardGrid.test.tsx
 */
import { EditorialCard } from './EditorialCard';
import type { EditorialItem } from './today-types';

interface EditorialCardGridProps {
  readonly title: string;
  readonly items: readonly EditorialItem[];
  readonly columns: 2 | 4;
}

export function EditorialCardGrid({ title, items, columns }: EditorialCardGridProps) {
  const gridColumnsClass =
    columns === 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-2';

  return (
    <section aria-label={title} className="space-y-6">
      <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
      <div
        data-testid="editorial-card-grid"
        className={`grid grid-cols-1 gap-6 ${gridColumnsClass}`}
      >
        {items.map((item) => (
          <EditorialCard
            key={item.id}
            item={item}
            size={columns === 4 ? 'small' : 'medium'}
          />
        ))}
      </div>
    </section>
  );
}
