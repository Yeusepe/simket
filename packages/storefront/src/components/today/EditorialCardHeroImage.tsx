/**
 * Purpose: Hero artwork for editorial cards — single cover or layered transparent
 * cutout — shared by compact tiles and default split layout.
 * Governing docs:
 *   - docs/architecture.md
 */
import type { EditorialItem } from './today-types';

const DEPTH_LAYER_CLASSES = {
  square:
    'absolute inset-x-5 bottom-0 top-3 h-[calc(100%-0.75rem)] w-[calc(100%-2.5rem)] object-contain drop-shadow-2xl',
  small:
    'absolute inset-x-4 bottom-0 top-2 h-[calc(100%-0.5rem)] w-[calc(100%-2rem)] object-contain drop-shadow-xl',
  medium:
    'absolute inset-x-6 bottom-0 top-4 h-[calc(100%-1rem)] w-[calc(100%-3rem)] object-contain drop-shadow-2xl',
} as const;

type DepthPreset = keyof typeof DEPTH_LAYER_CLASSES;

function EditorialHeroArtwork({
  item,
  depthPreset,
}: {
  readonly item: EditorialItem;
  readonly depthPreset: DepthPreset;
}) {
  if (!item.heroTransparent) {
    return (
      <img
        src={item.heroImage}
        alt={item.title}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <>
      <img
        src={item.heroImage}
        alt={item.title}
        className="absolute inset-0 h-full w-full object-cover opacity-35"
        loading="lazy"
      />
      <img
        data-testid="editorial-card-depth-image"
        src={item.heroTransparent}
        alt=""
        aria-hidden="true"
        className={DEPTH_LAYER_CLASSES[depthPreset]}
        loading="lazy"
      />
    </>
  );
}

export interface EditorialCardHeroImageProps {
  readonly item: EditorialItem;
  /** Square split (horizontal scroll / default card) vs compact bento grid tiles. */
  readonly variant: 'square' | 'compact';
  /** Only for `variant="compact"`. */
  readonly compactDensity?: 'small' | 'medium';
}

export function EditorialCardHeroImage({
  item,
  variant,
  compactDensity = 'medium',
}: EditorialCardHeroImageProps) {
  const depthPreset: DepthPreset =
    variant === 'square' ? 'square' : compactDensity === 'small' ? 'small' : 'medium';

  const rootClass =
    variant === 'compact'
      ? 'relative h-full min-h-0 w-full overflow-hidden bg-content2'
      : 'relative h-full w-full overflow-hidden bg-content2';

  return (
    <div className={rootClass}>
      <EditorialHeroArtwork item={item} depthPreset={depthPreset} />
    </div>
  );
}
