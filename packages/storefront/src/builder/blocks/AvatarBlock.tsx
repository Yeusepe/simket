/**
 * Purpose: Render HeroUI v3 avatar profiles for creator identity and collaborator presence.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://heroui.com/docs/react/components/avatar.mdx
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/blocks/AvatarBlock.test.tsx
 */
import { Avatar } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarColor = 'default' | 'accent' | 'success' | 'warning' | 'danger';
type AvatarVariant = 'soft';

export interface AvatarBlockProps {
  readonly name?: string;
  readonly subtitle?: string;
  readonly imageUrl?: string;
  readonly fallback?: string;
  readonly size?: AvatarSize;
  readonly color?: AvatarColor;
  readonly variant?: AvatarVariant;
  readonly children?: ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.trim()[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const avatarBlockDefinition: BlockDefinition = {
  type: 'avatar',
  label: 'Avatar',
  icon: 'circle-user-round',
  defaultProps: {
    name: 'Simket Creator',
    subtitle: 'Launching new packs weekly',
    imageUrl: '',
    fallback: 'SC',
    size: 'lg',
    color: 'accent',
    variant: 'soft',
  },
  propSchema: {
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Name',
        required: true,
        defaultValue: 'Simket Creator',
      },
      {
        name: 'subtitle',
        type: 'text',
        label: 'Subtitle',
        required: false,
        defaultValue: 'Launching new packs weekly',
      },
      {
        name: 'imageUrl',
        type: 'image',
        label: 'Image',
        required: false,
        defaultValue: '',
      },
      {
        name: 'fallback',
        type: 'text',
        label: 'Fallback text',
        required: false,
        defaultValue: 'SC',
      },
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        required: true,
        defaultValue: 'lg',
        options: ['sm', 'md', 'lg'],
      },
      {
        name: 'color',
        type: 'select',
        label: 'Color',
        required: true,
        defaultValue: 'accent',
        options: ['default', 'accent', 'success', 'warning', 'danger'],
      },
    ],
  },
};

export function AvatarBlock({
  name = 'Simket Creator',
  subtitle = 'Launching new packs weekly',
  imageUrl = '',
  fallback,
  size = 'lg',
  color = 'accent',
  variant = 'soft',
  children,
}: AvatarBlockProps) {
  const safeFallback = fallback && fallback.trim().length > 0 ? fallback : getInitials(name);

  return (
    <div className="flex items-center gap-4">
      <Avatar color={color} size={size} variant={variant}>
        {imageUrl ? <Avatar.Image alt={name} src={imageUrl} /> : null}
        <Avatar.Fallback>{safeFallback}</Avatar.Fallback>
      </Avatar>
      <div className="space-y-1">
        <p className="font-semibold">{name}</p>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}
