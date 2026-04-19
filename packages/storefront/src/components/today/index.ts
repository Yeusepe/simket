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
export type { TodaySectionProps } from './TodaySection';
export { HeroBanner } from './HeroBanner';
export {
  BentoHeroFrame,
  DEFAULT_BENTO_SHELL_COLOR,
  spotlightHeadlineClass,
} from './BentoHeroFrame';
export type { BentoHeroFrameProps } from './BentoHeroFrame';
export { SpotlightHeroFooter } from './SpotlightHeroFooter';
export type { SpotlightHeroFooterProps } from './SpotlightHeroFooter';
export { BentoTodayHero } from './BentoTodayHero';
export { EditorialCardGrid } from './EditorialCardGrid';
export { EditorialCard } from './EditorialCard';
export { HorizontalScroll } from './HorizontalScroll';
export { useEditorial } from './use-editorial';
export type { EditorialSection, EditorialItem, UseEditorialResult } from './today-types';
