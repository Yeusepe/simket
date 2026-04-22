/**
 * Purpose: Orchestrate loading, error handling, and layout-specific rendering
 * for the storefront Today editorial section.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/button
 *   - https://www.heroui.com/docs/react/components/skeleton
 * Tests:
 *   - packages/storefront/src/components/today/TodaySection.test.tsx
 */
import { Button, Skeleton } from '@heroui/react';
import { BentoTodayHero } from './BentoTodayHero';
import { EditorialCardGrid } from './EditorialCardGrid';
import { HeroBanner } from './HeroBanner';
import { HorizontalScroll } from './HorizontalScroll';
import { TrendingProductsSection } from './TrendingProductsSection';
import { useEditorial } from './use-editorial';
import type { EditorialSection as TodayEditorialSection } from './today-types';

export interface TodaySectionProps {
  /** CSS color for the merged bento featured tile frame + gradient (see `BentoHeroFrame`). */
  readonly bentoShellColor?: string;
}

type SectionRenderPlan =
  | { readonly kind: 'bento'; readonly hero: TodayEditorialSection; readonly picks: TodayEditorialSection }
  | { readonly kind: 'single'; readonly section: TodayEditorialSection };

function planEditorialSections(sections: readonly TodayEditorialSection[]): readonly SectionRenderPlan[] {
  const result: SectionRenderPlan[] = [];
  let index = 0;
  while (index < sections.length) {
    const current = sections[index]!;
    const next = sections[index + 1];
    if (
      current.layout === 'hero-banner' &&
      current.items.length > 0 &&
      next?.layout === 'card-grid-4' &&
      next.items.length > 0
    ) {
      result.push({ kind: 'bento', hero: current, picks: next });
      index += 2;
    } else {
      result.push({ kind: 'single', section: current });
      index += 1;
    }
  }
  return result;
}

function renderSection(section: TodayEditorialSection) {
  /** Catalog products — editorial `items` are ignored (Payload may still send a placeholder list). */
  if (section.layout === 'horizontal-scroll' && section.slug === 'trending') {
    return (
      <div data-testid="today-layout-trending-products" key={section.id}>
        <TrendingProductsSection title={section.name} />
      </div>
    );
  }

  if (section.items.length === 0) {
    return null;
  }

  switch (section.layout) {
    case 'hero-banner':
      return (
        <div data-testid="today-layout-hero-banner" key={section.id}>
          <HeroBanner item={section.items[0]!} sectionName={section.name} />
        </div>
      );
    case 'card-grid-4':
      return (
        <div data-testid="today-layout-card-grid-4" key={section.id}>
          <EditorialCardGrid title={section.name} items={section.items} columns={4} />
        </div>
      );
    case 'card-grid-2':
      return (
        <div data-testid="today-layout-card-grid-2" key={section.id}>
          <EditorialCardGrid title={section.name} items={section.items} columns={2} />
        </div>
      );
    case 'horizontal-scroll':
      return (
        <div data-testid="today-layout-horizontal-scroll" key={section.id}>
          <HorizontalScroll title={section.name} items={section.items} />
        </div>
      );
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div data-testid="today-loading-skeleton">
        <div className="flex w-full max-w-4xl flex-col gap-4 lg:grid lg:aspect-[2/1] lg:grid-cols-4 lg:grid-rows-2 lg:gap-3">
          <Skeleton className="aspect-square w-full rounded-[2rem] lg:col-span-2 lg:row-span-2 lg:aspect-auto lg:h-full" />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-3xl lg:aspect-auto lg:h-full" />
          ))}
        </div>
      </div>
      <div data-testid="today-loading-skeleton">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-3xl" />
          ))}
        </div>
      </div>
      <div data-testid="today-loading-skeleton">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="mt-4 flex gap-6 overflow-hidden">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-80 min-w-[18rem] rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TodaySection({ bentoShellColor }: TodaySectionProps = {}) {
  const {
    sections,
    isLoading,
    error,
    hasFreshContent,
    dismissFreshContent,
    refetch,
  } = useEditorial();
  const visibleSections = [...sections]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
    .filter(
      (section) =>
        section.items.length > 0 ||
        (section.layout === 'horizontal-scroll' && section.slug === 'trending'),
    );
  const renderPlan = planEditorialSections(visibleSections);

  return (
    <section aria-label="Today" className="space-y-8">
      {hasFreshContent && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary-50 px-4 py-3 text-primary-700">
          <p className="text-sm font-medium">New content available.</p>
          <Button size="sm" variant="secondary" onPress={dismissFreshContent}>
            Dismiss
          </Button>
        </div>
      )}

      {isLoading && visibleSections.length === 0 && <LoadingSkeleton />}

      {!isLoading && error && visibleSections.length === 0 && (
        <div className="rounded-3xl border border-danger/30 bg-danger-50 p-6 text-danger-700">
          <p className="font-medium">We couldn&apos;t load Today right now.</p>
          <p className="mt-2 text-sm">{error.message}</p>
          <div className="mt-4">
            <Button variant="secondary" onPress={refetch}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {!isLoading && !error && renderPlan.length === 0 && (
        <div className="rounded-3xl border border-border/70 bg-surface-secondary p-6">
          <p className="text-lg font-semibold text-foreground">Today is getting ready</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Public editorial picks and featured catalog highlights will appear here as soon as
            they are available.
          </p>
          <div className="mt-4">
            <Button variant="secondary" onPress={refetch}>
              Refresh Today
            </Button>
          </div>
        </div>
      )}

      {renderPlan.map((entry) =>
        entry.kind === 'bento' ? (
          <BentoTodayHero
            key={`${entry.hero.id}-${entry.picks.id}`}
            heroSection={entry.hero}
            picksSection={entry.picks}
            shellColor={bentoShellColor}
          />
        ) : (
          renderSection(entry.section)
        ),
      )}
    </section>
  );
}
