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
import { EditorialCardGrid } from './EditorialCardGrid';
import { HeroBanner } from './HeroBanner';
import { HorizontalScroll } from './HorizontalScroll';
import { useEditorial } from './use-editorial';
import type { EditorialSection as TodayEditorialSection } from './today-types';

function renderSection(section: TodayEditorialSection) {
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
        <Skeleton className="h-[28rem] w-full rounded-[2rem]" />
      </div>
      <div data-testid="today-loading-skeleton">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-80 w-full rounded-3xl" />
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

export function TodaySection() {
  const { sections, isLoading, error, refetch } = useEditorial();
  const visibleSections = [...sections]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
    .filter((section) => section.items.length > 0);

  return (
    <section aria-labelledby="today-heading" className="space-y-8">
      <div className="space-y-2">
        <h2 id="today-heading" className="text-3xl font-bold tracking-tight">
          Today
        </h2>
        <p className="text-sm text-default-500">
          Editorial picks curated by the Simket content team.
        </p>
      </div>

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

      {visibleSections.map((section) => renderSection(section))}
    </section>
  );
}
