/**
 * Purpose: Framely block that renders the live creator profile for a store page.
 * Governing docs:
 *   - docs/architecture.md (§5 Framely integration, §12 source of truth)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
import { Avatar, Card } from '@heroui/react';
import type { BlockDefinition, FramelyRenderContext } from '../../../../framely-app/src/index';
import type { CreatorStore } from '../../store/types';

interface StoreProfileBlockProps {
  readonly showAvatar?: boolean;
  readonly showTagline?: boolean;
  readonly showBio?: boolean;
  readonly framelyContext?: FramelyRenderContext;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStore(context?: FramelyRenderContext): CreatorStore | null {
  return isRecord(context?.store) ? (context.store as unknown as CreatorStore) : null;
}

export const storeProfileBlockDefinition: BlockDefinition = {
  type: 'store-profile',
  label: 'Store Profile',
  icon: 'user',
  defaultProps: {
    showAvatar: true,
    showTagline: true,
    showBio: true,
  },
  propSchema: {
    fields: [
      {
        name: 'showAvatar',
        type: 'boolean',
        label: 'Show avatar',
        required: false,
        defaultValue: true,
      },
      {
        name: 'showTagline',
        type: 'boolean',
        label: 'Show tagline',
        required: false,
        defaultValue: true,
      },
      {
        name: 'showBio',
        type: 'boolean',
        label: 'Show bio',
        required: false,
        defaultValue: true,
      },
    ],
  },
};

export function StoreProfileBlock({
  showAvatar = true,
  showTagline = true,
  showBio = true,
  framelyContext,
}: StoreProfileBlockProps) {
  const store = getStore(framelyContext);

  if (!store) {
    return null;
  }

  return (
    <Card variant="secondary">
      <Card.Content className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        {showAvatar ? (
          <Avatar className="size-20">
            {store.creator.avatarUrl ? (
              <Avatar.Image src={store.creator.avatarUrl} alt={store.creator.displayName} />
            ) : null}
            <Avatar.Fallback>{store.creator.displayName.slice(0, 2).toUpperCase()}</Avatar.Fallback>
          </Avatar>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{store.creator.displayName}</h1>
          {showTagline ? (
            <p className="text-base text-muted-foreground">{store.creator.tagline}</p>
          ) : null}
          {showBio ? <p className="text-sm text-muted-foreground">{store.creator.bio}</p> : null}
        </div>
      </Card.Content>
    </Card>
  );
}
