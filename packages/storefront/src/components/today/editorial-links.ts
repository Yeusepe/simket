/**
 * Purpose: Canonical storefront paths for editorial story URLs.
 * Governing docs:
 *   - docs/architecture.md
 */
export function getEditorialStoryHref(slug: string): string {
  return `/editorial/${slug}`;
}
