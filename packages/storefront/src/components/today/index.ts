/**
 * Purpose: Barrel exports for Today editorial storefront components and hook.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/today/TodaySection.test.tsx
 */
export { TodaySection } from './TodaySection';
export { HeroBanner } from './HeroBanner';
export { EditorialCardGrid } from './EditorialCardGrid';
export { EditorialCard } from './EditorialCard';
export { HorizontalScroll } from './HorizontalScroll';
export { useEditorial } from './use-editorial';
export type { EditorialSection, EditorialItem, UseEditorialResult } from './today-types';
