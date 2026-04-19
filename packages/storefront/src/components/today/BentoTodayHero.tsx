/**
 * Purpose: Two-tier bento layout — one large square featured tile plus a 2×2 grid
 * of small square editorial picks.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 */
import { BentoHeroFrame, DEFAULT_BENTO_SHELL_COLOR } from './BentoHeroFrame';
import { editorialBentoFields } from './editorial-bento-fields';
import { HeroBanner } from './HeroBanner';
import { getEditorialStoryHref } from './editorial-links';
import type { EditorialSection } from './today-types';

interface BentoTodayHeroProps {
  readonly heroSection: EditorialSection;
  readonly picksSection: EditorialSection;
  /** Passed to the featured bento tile (`HeroBanner` shell + gradient). */
  readonly shellColor?: string;
  readonly onHeroReadMore?: () => void;
}

export function BentoTodayHero({ heroSection, picksSection, shellColor, onHeroReadMore }: BentoTodayHeroProps) {
  const heroItem = heroSection.items[0]!;
  const picks = picksSection.items.slice(0, 4);
  const pickShell = shellColor ?? DEFAULT_BENTO_SHELL_COLOR;

  return (
    <div data-testid="today-layout-bento" className="space-y-4">
      <header>
        <h3 className="text-2xl font-semibold tracking-tight">{heroSection.name}</h3>
        <p className="text-sm text-default-500">{picksSection.name}</p>
      </header>

      <div className="flex flex-col gap-4 lg:aspect-[2/1] lg:w-full lg:min-h-0 lg:max-h-[min(85vh,920px)] lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-2 lg:gap-3">
        <div className="min-h-0 w-full aspect-square lg:row-span-2 lg:aspect-auto lg:h-full">
          <HeroBanner
            item={heroItem}
            sectionName={heroSection.name}
            variant="bento"
            shellColor={shellColor}
            onReadMore={onHeroReadMore}
          />
        </div>

        {picks.map((item) => {
          const bento = editorialBentoFields(
            { ...item, spotlightEyebrow: item.spotlightEyebrow ?? 'PICK' },
            picksSection.name,
          );
          return (
            <div key={item.id} className="min-h-0 min-w-0 aspect-square lg:aspect-auto lg:h-full">
              <BentoHeroFrame
                shellColor={pickShell}
                heroImage={item.heroImage}
                heroImageAlt={item.title}
                eyebrow={bento.eyebrow}
                title={item.title}
                spotlightSubline={item.spotlightSubline}
                density="compact"
                productName={bento.productName}
                creatorName={bento.creatorName}
                productThumbnailUrl={item.productThumbnailUrl}
                storyHref={getEditorialStoryHref(item.slug)}
                spotlightCtaLabel={bento.spotlightCtaLabel}
                showSpotlightCta={bento.showSpotlightCta}
                testId={`bento-pick-${item.slug}`}
                dataVariant="bento-pick"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
