/**
 * Purpose: Centralised icon component wrapping @iconify/react with Streamline Plump Flat icons.
 * All icons across the storefront must use this component instead of emojis or raw glyphs.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 * External references:
 *   - https://www.streamlinehq.com/icons/plump-flat-style
 *   - https://iconify.design/docs/icon-components/react/
 * Tests:
 *   - packages/storefront/src/components/common/Icon.test.tsx
 */
import { Icon as IconifyIcon } from '@iconify/react';

/**
 * Icon name mapping from semantic names to Streamline Plump Flat icon identifiers.
 * Browse: https://icon-sets.iconify.design/streamline-plump/
 */
const ICON_MAP = {
  // Navigation
  home: 'streamline-plump:house-1',
  search: 'streamline-plump:magnifying-glass',
  cart: 'streamline-plump:shopping-cart-2',
  library: 'streamline-plump:book-open',
  notifications: 'streamline-plump:alarm-bell',
  profile: 'streamline-plump:single-neutral',
  settings: 'streamline-plump:cog',
  menu: 'streamline-plump:navigation-menu-1',
  close: 'streamline-plump:delete-1',

  // Theme
  sun: 'streamline-plump:sun-1',
  moon: 'streamline-plump:moon-1',

  // Actions
  plus: 'streamline-plump:add-circle',
  edit: 'streamline-plump:pencil-write',
  check: 'streamline-plump:check-circle-1',
  'arrow-up': 'streamline-plump:arrow-up-1',
  'arrow-down': 'streamline-plump:arrow-down-1',

  // Wishlist
  'heart-filled': 'streamline-plump:love-it',
  'heart-outline': 'streamline-plump:love-it',

  // Dashboard stats
  revenue: 'streamline-plump:money-wallet',
  sales: 'streamline-plump:shopping-cart-2',
  views: 'streamline-plump:view-1',
  conversion: 'streamline-plump:flash-1',

  // Dashboard nav
  products: 'streamline-plump:box-1',
  licenses: 'streamline-plump:key',
  templates: 'streamline-plump:layout-module-1',
  collaborations: 'streamline-plump:multiple-neutral-1',
  flows: 'streamline-plump:arrow-switch-horizontal',
  chart: 'streamline-plump:graph-bar-increase',

  // Notification types
  purchase: 'streamline-plump:shopping-cart-2',
  'collaboration-invite': 'streamline-plump:multiple-neutral-1',
  'collaboration-accepted': 'streamline-plump:check-circle-1',
  'product-update': 'streamline-plump:box-1',
  'price-drop': 'streamline-plump:money-wallet',
  system: 'streamline-plump:alarm-bell',
  'gift-received': 'streamline-plump:gift',
  review: 'streamline-plump:rating-star',
  settlement: 'streamline-plump:money-wallet',

  // Activity types
  sale: 'streamline-plump:money-wallet',
  collaboration: 'streamline-plump:multiple-neutral-1',
  'product-edit': 'streamline-plump:pencil-write',
} as const;

export type IconName = keyof typeof ICON_MAP;

interface IconProps {
  readonly name: IconName;
  readonly size?: number | string;
  readonly className?: string;
  readonly 'aria-hidden'?: boolean;
}

export function Icon({
  name,
  size = 20,
  className,
  'aria-hidden': ariaHidden = true,
}: IconProps) {
  const iconId = ICON_MAP[name];
  return (
    <IconifyIcon
      icon={iconId}
      width={size}
      height={size}
      className={className}
      aria-hidden={ariaHidden}
    />
  );
}
