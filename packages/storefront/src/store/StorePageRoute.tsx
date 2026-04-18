/**
 * Purpose: Render creator-store homepages and custom sub-pages from store context.
 * Governing docs:
 *   - docs/architecture.md (§1 storefront, §5 Framely integration)
 *   - docs/service-architecture.md (§1 client features)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§5 testing)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/store/StoreLayout.test.tsx
 */
import { PageRenderer } from '../builder';
import { StoreNotFoundPage } from './StoreNotFoundPage';
import { DefaultStoreTemplate } from './DefaultStoreTemplate';
import { useStore } from './use-store';

export function StorePageRoute() {
  const { currentPage, resolution, store } = useStore();

  if (resolution.routeKind === 'page') {
    if (!currentPage?.schema) {
      return (
        <StoreNotFoundPage
          title="Page not found"
          message={`The page "${resolution.pageSlug}" does not exist in ${store.creator.displayName}'s store.`}
        />
      );
    }

    return (
      <PageRenderer
        schema={{
          ...currentPage.schema,
          theme: {
            ...store.theme,
            ...(currentPage.schema.theme ?? {}),
          },
        }}
      />
    );
  }

  if (resolution.routeKind === 'home' && currentPage?.schema) {
    return (
      <PageRenderer
        schema={{
          ...currentPage.schema,
          theme: {
            ...store.theme,
            ...(currentPage.schema.theme ?? {}),
          },
        }}
      />
    );
  }

  if (resolution.routeKind === 'home') {
    return <DefaultStoreTemplate />;
  }

  return (
    <StoreNotFoundPage
      message={`The requested route is not available for ${store.creator.displayName}'s store.`}
    />
  );
}
