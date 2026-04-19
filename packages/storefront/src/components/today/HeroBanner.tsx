/**
 * Purpose: Render the featured Today hero banner with layered artwork,
 * metadata, and a primary CTA.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/today/HeroBanner.test.tsx
 */
import { Button, Chip } from '@heroui/react';

import { BentoHeroFrame, DEFAULT_BENTO_SHELL_COLOR } from './BentoHeroFrame';
import type { EditorialItem } from './today-types';

interface HeroBannerProps {
  readonly item: EditorialItem;
  readonly sectionName?: string;
  /** `bento` is a square tile without the side depth column (paired with small square picks). */
  readonly variant?: 'full' | 'bento';
  /**
   * Bento only: CSS color for the outer frame and bottom image fade.
   * Any valid CSS color (hex, rgb, `var(--token)`, `oklch(...)`).
   */
  readonly shellColor?: string;
  /** Bento only: override navigation when "Read more" is pressed. */
  readonly onReadMore?: () => void;
}

function formatPublishedDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getEditorialHref(slug: string): string {
  return `/editorial/${slug}`;
}

function navigateToEditorialStory(slug: string): void {
  window.location.assign(getEditorialHref(slug));
}

export function HeroBanner({
  item,
  sectionName = 'Today',
  variant = 'full',
  shellColor = DEFAULT_BENTO_SHELL_COLOR,
  onReadMore,
}: HeroBannerProps) {
  const isBento = variant === 'bento';

  if (isBento) {
    const productName = item.productName ?? item.title;
    const creatorName = item.creatorName ?? item.author;

    return (
      <BentoHeroFrame
        shellColor={shellColor}
        heroImage={item.heroImage}
        heroImageAlt={item.title}
        eyebrow={sectionName}
        title={item.title}
        productName={productName}
        creatorName={creatorName}
        productThumbnailUrl={item.productThumbnailUrl}
        storyHref={getEditorialHref(item.slug)}
        onReadMore={onReadMore}
        testId="hero-banner"
        dataVariant="bento"
      />
    );
  }

  return (
    <article
      data-testid="hero-banner"
      data-variant={variant}
      className="grid overflow-hidden rounded-[2rem] border border-divider bg-content1 shadow-xl lg:grid-cols-[minmax(0,1fr)_18rem]"
    >
      <div className="relative min-h-[28rem] overflow-hidden">
        <img
          src={item.heroImage}
          alt={item.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/45 to-black/5" />

        <div className="relative z-10 flex h-full flex-col justify-end gap-5 p-6 text-white sm:p-10">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/75">
              {sectionName}
            </p>
            <h2 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{item.title}</h2>
            <p className="max-w-2xl text-sm text-white/80 sm:text-base">{item.excerpt}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
            <span>{item.author}</span>
            <span aria-hidden="true">•</span>
            <span>{formatPublishedDate(item.publishedAt)}</span>
          </div>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Chip key={tag} size="sm" variant="soft" className="bg-white/15 text-white">
                  <Chip.Label>{tag}</Chip.Label>
                </Chip>
              ))}
            </div>
          )}

          <div>
            <Button variant="primary" onPress={() => navigateToEditorialStory(item.slug)}>
              Read More
            </Button>
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-content2 lg:block">
        {item.heroTransparent ? (
          <>
            <img
              src={item.heroImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-20"
            />
            <img
              data-testid="hero-banner-depth-image"
              src={item.heroTransparent}
              alt=""
              aria-hidden="true"
              className="absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)] translate-y-3 object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.45)] transition-transform duration-300"
            />
          </>
        ) : (
          <img
            src={item.heroImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
        )}
      </div>
    </article>
  );
}
