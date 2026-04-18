/**
 * Purpose: Home page shell with the editorial Today section followed by the
 * discovery feed placeholder.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/pages/HomePage.test.tsx
 */
import { TodaySection } from '../components/today';

export function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <TodaySection />

      <section aria-label="Discover" className="mt-12">
        <h2 className="mb-6 text-2xl font-bold">Discover</h2>
        <p className="text-muted-foreground">
          Infinite scroll recommendations will appear here — powered by the
          pluggable recommendation pipeline.
        </p>
      </section>
    </div>
  );
}
