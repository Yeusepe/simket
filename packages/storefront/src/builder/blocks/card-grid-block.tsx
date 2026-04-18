/**
 * Purpose: Render a grid of creator-selected product or content cards in a builder schema.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 Product, FramelyProject)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://heroui.com/docs/react/components/card
 *   - https://heroui.com/docs/react/components/chip
 * Tests:
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import { Card, Chip } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

export interface CardGridItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly price?: string;
  readonly href?: string;
  readonly imageUrl?: string;
  readonly tags?: readonly string[];
}

export interface CardGridBlockProps {
  readonly heading?: string;
  readonly columns?: 2 | 4;
  readonly cards?: readonly CardGridItem[];
  readonly children?: ReactNode;
}

export const cardGridBlockDefinition: BlockDefinition = {
  type: 'card-grid',
  label: 'Card grid',
  icon: 'grid-2x2',
  defaultProps: {
    heading: 'Featured products',
    columns: 2,
    cards: [
      {
        id: 'featured-1',
        title: 'Stylized VFX pack',
        description: 'Particles, hit flashes, and impact presets for indie action games.',
        price: '$29.00',
        href: '#',
        tags: ['Unity', 'VFX'],
      },
      {
        id: 'featured-2',
        title: 'UI icon bundle',
        description: 'A consistent, export-ready icon set for creator dashboards.',
        price: '$18.00',
        href: '#',
        tags: ['Icons', 'UI'],
      },
    ],
  },
  propSchema: {
    fields: [
      { name: 'heading', type: 'text', label: 'Heading', required: false, defaultValue: 'Featured products' },
      { name: 'columns', type: 'select', label: 'Columns', required: true, defaultValue: 2, options: ['2', '4'] },
    ],
  },
};

export function CardGridBlock({
  heading = 'Featured products',
  columns = 2,
  cards = cardGridBlockDefinition.defaultProps.cards as readonly CardGridItem[],
  children,
}: CardGridBlockProps) {
  const gridClass =
    columns === 4
      ? 'grid gap-6 md:grid-cols-2 xl:grid-cols-4'
      : 'grid gap-6 md:grid-cols-2';

  return (
    <section className="space-y-6">
      {heading ? <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2> : null}
      <div className={gridClass}>
        {cards.map((card) => (
          <Card key={card.id} className="h-full gap-3 rounded-[var(--builder-border-radius,1.5rem)]">
            {card.imageUrl ? (
              <img
                alt={card.title}
                className="aspect-video w-full rounded-[calc(var(--builder-border-radius,1.5rem)-0.5rem)] object-cover"
                loading="lazy"
                src={card.imageUrl}
              />
            ) : null}
            <Card.Header>
              <Card.Title>{card.title}</Card.Title>
              {card.description ? (
                <Card.Description>{card.description}</Card.Description>
              ) : null}
            </Card.Header>
            {card.tags?.length ? (
              <Card.Content className="flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <Chip key={tag} size="sm" variant="soft">
                    {tag}
                  </Chip>
                ))}
              </Card.Content>
            ) : null}
            <Card.Footer className="mt-auto flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{card.price ?? 'Learn more'}</span>
              {card.href ? (
                <a className="link text-sm font-medium" href={card.href}>
                  View
                </a>
              ) : null}
            </Card.Footer>
          </Card>
        ))}
      </div>
      {children}
    </section>
  );
}
