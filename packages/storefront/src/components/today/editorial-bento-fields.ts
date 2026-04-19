/**
 * Purpose: Map `EditorialItem` + section label to bento spotlight footer/CTA fields
 * shared by `HeroBanner` (bento) and `BentoTodayHero` picks.
 * Governing docs:
 *   - docs/architecture.md
 */
import type { EditorialItem } from './today-types';

export function editorialBentoFields(item: EditorialItem, sectionName: string) {
  const productName = item.productName ?? item.title;
  const creatorName = item.creatorName ?? item.author;
  const eyebrow = item.spotlightEyebrow ?? sectionName;
  const showSpotlightCta = item.hideSpotlightCta !== true;
  const priceText = item.spotlightPriceFormatted?.trim();
  const usePrice =
    showSpotlightCta && Boolean(priceText) && item.hideSpotlightPrice !== true;
  const spotlightCtaLabel = usePrice && priceText ? priceText : 'Read more';

  return {
    productName,
    creatorName,
    eyebrow,
    showSpotlightCta,
    spotlightCtaLabel,
  };
}
