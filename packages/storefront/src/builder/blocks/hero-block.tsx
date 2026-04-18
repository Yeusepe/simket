/**
 * Purpose: Render a customizable creator-store hero section with copy, media, and a CTA.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://heroui.com/docs/react/components/button
 *   - https://heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/builder/builder.test.tsx
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import { Card, Link } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'outline'
  | 'ghost'
  | 'danger';

export interface HeroBlockProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly ctaLabel?: string;
  readonly ctaHref?: string;
  readonly ctaVariant?: ButtonVariant;
  readonly backgroundImageUrl?: string;
  readonly align?: 'left' | 'center' | 'right';
  readonly overlayOpacity?: number;
  readonly children?: ReactNode;
}

const alignmentClasses: Record<NonNullable<HeroBlockProps['align']>, string> = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
};

export const heroBlockDefinition: BlockDefinition = {
  type: 'hero',
  label: 'Hero',
  icon: 'layout-template',
  defaultProps: {
    title: 'Launch your creator store',
    subtitle:
      'Pair Framely layouts with HeroUI building blocks to ship a storefront that feels like your brand.',
    ctaLabel: 'Explore products',
    ctaHref: '#',
    ctaVariant: 'primary',
    backgroundImageUrl: '',
    align: 'left',
    overlayOpacity: 0.55,
  },
  propSchema: {
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true, defaultValue: 'Launch your creator store' },
      {
        name: 'subtitle',
        type: 'text',
        label: 'Subtitle',
        required: false,
        defaultValue:
          'Pair Framely layouts with HeroUI building blocks to ship a storefront that feels like your brand.',
      },
      { name: 'ctaLabel', type: 'text', label: 'CTA label', required: false, defaultValue: 'Explore products' },
      { name: 'ctaHref', type: 'url', label: 'CTA link', required: false, defaultValue: '#' },
      {
        name: 'ctaVariant',
        type: 'select',
        label: 'CTA variant',
        required: true,
        defaultValue: 'primary',
        options: ['primary', 'secondary', 'tertiary', 'outline', 'ghost', 'danger'],
      },
      { name: 'backgroundImageUrl', type: 'image', label: 'Background image', required: false, defaultValue: '' },
      {
        name: 'align',
        type: 'select',
        label: 'Content alignment',
        required: true,
        defaultValue: 'left',
        options: ['left', 'center', 'right'],
      },
      {
        name: 'overlayOpacity',
        type: 'number',
        label: 'Overlay opacity',
        required: false,
        defaultValue: 0.55,
      },
    ],
  },
};

export function HeroBlock({
  title = 'Launch your creator store',
  subtitle = 'Pair Framely layouts with HeroUI building blocks to ship a storefront that feels like your brand.',
  ctaLabel = 'Explore products',
  ctaHref = '#',
  ctaVariant = 'primary',
  backgroundImageUrl = '',
  align = 'left',
  overlayOpacity = 0.55,
  children,
}: HeroBlockProps) {
  const safeAlignment = alignmentClasses[align] ?? alignmentClasses.left;

  return (
    <Card className="relative overflow-hidden rounded-[var(--builder-border-radius,1.5rem)] border-0 bg-transparent text-foreground">
      {backgroundImageUrl ? (
        <img
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          src={backgroundImageUrl}
        />
      ) : null}
      <div
        className="absolute inset-0 bg-black/55"
        style={{ opacity: overlayOpacity }}
      />
      <Card.Content className="relative min-h-[22rem] px-6 py-16 sm:px-10">
        <div className={`mx-auto flex max-w-3xl flex-col gap-5 ${safeAlignment}`}>
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            Creator storefront
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-2xl text-base text-white/80 sm:text-lg">{subtitle}</p>
          ) : null}
          {ctaLabel ? (
            <div className="pt-2">
              <Link
                className={[
                  'button',
                  `button--${ctaVariant}`,
                  'button--md inline-flex',
                ].join(' ')}
                href={ctaHref}
              >
                {ctaLabel}
              </Link>
            </div>
          ) : null}
          {children}
        </div>
      </Card.Content>
    </Card>
  );
}
