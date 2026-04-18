/**
 * Purpose: Render HeroUI v3 skeleton placeholders for loading previews in creator-store pages.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://heroui.com/docs/react/components/skeleton.mdx
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/blocks/SkeletonBlock.test.tsx
 */
import { Skeleton } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

type SkeletonVariant = 'card' | 'text' | 'avatar' | 'grid';
type SkeletonAnimation = 'shimmer' | 'pulse' | 'none';

export interface SkeletonBlockProps {
  readonly heading?: string;
  readonly variant?: SkeletonVariant;
  readonly animationType?: SkeletonAnimation;
  readonly children?: ReactNode;
}

export const skeletonBlockDefinition: BlockDefinition = {
  type: 'skeleton',
  label: 'Skeleton',
  icon: 'loader-circle',
  defaultProps: {
    heading: 'Loading preview',
    variant: 'card',
    animationType: 'shimmer',
  },
  propSchema: {
    fields: [
      {
        name: 'heading',
        type: 'text',
        label: 'Heading',
        required: false,
        defaultValue: 'Loading preview',
      },
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        required: true,
        defaultValue: 'card',
        options: ['card', 'text', 'avatar', 'grid'],
      },
      {
        name: 'animationType',
        type: 'select',
        label: 'Animation',
        required: true,
        defaultValue: 'shimmer',
        options: ['shimmer', 'pulse', 'none'],
      },
    ],
  },
};

function renderSkeletonLayout(variant: SkeletonVariant, animationType: SkeletonAnimation) {
  switch (variant) {
    case 'text':
      return (
        <div className="w-full max-w-md space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton
              animationType={animationType}
              className="h-4 rounded"
              data-testid="builder-skeleton-item"
              key={`text-${item}`}
            />
          ))}
        </div>
      );
    case 'avatar':
      return (
        <div className="flex items-center gap-3">
          <Skeleton
            animationType={animationType}
            className="h-12 w-12 shrink-0 rounded-full"
            data-testid="builder-skeleton-item"
          />
          <div className="flex-1 space-y-2">
            <Skeleton
              animationType={animationType}
              className="h-3 w-36 rounded-lg"
              data-testid="builder-skeleton-item"
            />
            <Skeleton
              animationType={animationType}
              className="h-3 w-24 rounded-lg"
              data-testid="builder-skeleton-item"
            />
          </div>
        </div>
      );
    case 'grid':
      return (
        <div className="grid w-full max-w-xl grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <Skeleton
              animationType={animationType}
              className="h-24 rounded-xl"
              data-testid="builder-skeleton-item"
              key={`grid-${item}`}
            />
          ))}
        </div>
      );
    case 'card':
    default:
      return (
        <div className="w-full max-w-sm space-y-5 rounded-[var(--builder-border-radius,1.5rem)] bg-transparent p-4 shadow-panel">
          <Skeleton
            animationType={animationType}
            className="h-32 rounded-lg"
            data-testid="builder-skeleton-item"
          />
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <Skeleton
                animationType={animationType}
                className="h-3 rounded-lg"
                data-testid="builder-skeleton-item"
                key={`card-${item}`}
              />
            ))}
          </div>
        </div>
      );
  }
}

export function SkeletonBlock({
  heading = 'Loading preview',
  variant = 'card',
  animationType = 'shimmer',
  children,
}: SkeletonBlockProps) {
  return (
    <div className="space-y-4" data-testid="builder-skeleton-block">
      {heading ? <h2 className="text-xl font-semibold tracking-tight">{heading}</h2> : null}
      {renderSkeletonLayout(variant, animationType)}
      {children}
    </div>
  );
}
