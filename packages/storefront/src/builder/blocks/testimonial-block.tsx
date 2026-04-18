/**
 * Purpose: Render customer reviews as HeroUI testimonial cards for creator stores.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://heroui.com/docs/react/components/avatar
 *   - https://heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import { Avatar, Card, Chip } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

export interface TestimonialBlockProps {
  readonly quote?: string;
  readonly authorName?: string;
  readonly authorTitle?: string;
  readonly avatarUrl?: string;
  readonly rating?: number;
  readonly children?: ReactNode;
}

export const testimonialBlockDefinition: BlockDefinition = {
  type: 'testimonial',
  label: 'Testimonial',
  icon: 'message-square-quote',
  defaultProps: {
    quote:
      'The Framely builder gave me a storefront that feels handcrafted without slowing down product launches.',
    authorName: 'Mia Creator',
    authorTitle: 'Environment artist',
    avatarUrl: '',
    rating: 5,
  },
  propSchema: {
    fields: [
      { name: 'quote', type: 'text', label: 'Quote', required: true },
      { name: 'authorName', type: 'text', label: 'Author', required: true, defaultValue: 'Mia Creator' },
      { name: 'authorTitle', type: 'text', label: 'Author title', required: false, defaultValue: 'Environment artist' },
      { name: 'avatarUrl', type: 'image', label: 'Avatar', required: false, defaultValue: '' },
      { name: 'rating', type: 'number', label: 'Rating', required: false, defaultValue: 5 },
    ],
  },
};

function getInitials(authorName: string): string {
  return authorName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function TestimonialBlock({
  quote = testimonialBlockDefinition.defaultProps.quote as string,
  authorName = 'Mia Creator',
  authorTitle = 'Environment artist',
  avatarUrl = '',
  rating = 5,
  children,
}: TestimonialBlockProps) {
  return (
    <Card className="gap-5 rounded-[var(--builder-border-radius,1.5rem)]">
      <Card.Header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Card.Title>What customers are saying</Card.Title>
          <Card.Description>Social proof for your creator brand.</Card.Description>
        </div>
        <Chip color="warning" variant="soft">
          {rating}/5
        </Chip>
      </Card.Header>
      <Card.Content className="space-y-5">
        <blockquote className="text-lg leading-8 text-foreground/90">
          “{quote}”
        </blockquote>
        <div className="flex items-center gap-3">
          <Avatar>
            {avatarUrl ? <Avatar.Image alt={authorName} src={avatarUrl} /> : null}
            <Avatar.Fallback>{getInitials(authorName)}</Avatar.Fallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold">{authorName}</span>
            {authorTitle ? (
              <span className="text-sm text-muted">{authorTitle}</span>
            ) : null}
          </div>
        </div>
        {children}
      </Card.Content>
    </Card>
  );
}
