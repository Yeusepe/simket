/**
 * Purpose: Centralised icon component wrapping @iconify/react with Streamline Flex Flat icons.
 * All icons across the storefront must use this component instead of emojis or raw glyphs.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 * External references:
 *   - https://www.streamlinehq.com/icons/flex-flat-style
 *   - https://icon-sets.iconify.design/streamline-flex/
 *   - https://iconify.design/docs/icon-components/react/
 * Tests:
 *   - packages/storefront/src/components/common/Icon.test.tsx
 */
import { Icon as IconifyIcon } from '@iconify/react';

/**
 * Icon name mapping from semantic names to Streamline Flex identifiers.
 * Prefer solid variants to keep the storefront on the requested flat style.
 * Browse: https://icon-sets.iconify.design/streamline-flex/
 */
const ICON_MAP = {
  // Navigation
  home: 'streamline-flex:home-2-solid',
  search: 'streamline-flex:magnifying-glass-solid',
  cart: 'streamline-flex:shopping-cart-2-solid',
  library: 'streamline-flex:book-reading-solid',
  notifications: 'streamline-flex:bell-notification-solid',
  profile: 'streamline-flex:user-circle-single-solid',
  settings: 'streamline-flex:cog-solid',
  menu: 'streamline-flex:watch-square-menu-solid',
  close: 'streamline-flex:shield-cross-solid',

  // Theme
  sun: 'streamline-flex:sun-solid',
  moon: 'streamline-flex:dark-dislay-mode-solid',

  // Actions
  plus: 'streamline-flex:application-add-solid',
  edit: 'streamline-flex:pencil-square-solid',
  check: 'streamline-flex:check-square-solid',
  'arrow-up': 'streamline-flex:arrow-up-solid',
  'arrow-down': 'streamline-flex:arrow-down-solid',
  'arrow-left': 'streamline-flex:arrow-left-solid',
  'arrow-right': 'streamline-flex:arrow-right-solid',

  // Wishlist
  'heart-filled': 'streamline-flex:heart-solid',
  'heart-outline': 'streamline-flex:heart',

  // Dashboard stats
  revenue: 'streamline-flex:wallet-solid',
  sales: 'streamline-flex:shopping-basket-2-solid',
  views: 'streamline-flex:binoculars-solid',
  conversion: 'streamline-flex:flash-3-solid',

  // Dashboard nav
  products: 'streamline-flex:shipping-box-2-solid',
  licenses: 'streamline-flex:key-frame-solid',
  templates: 'streamline-flex:layout-window-1-solid',
  collaborations: 'streamline-flex:user-collaborate-group-solid',
  flows: 'streamline-flex:merge-vertical-solid',
  chart: 'streamline-flex:graph-bar-increase-square-solid',

  // Notification types
  purchase: 'streamline-flex:shopping-basket-2-solid',
  'collaboration-invite': 'streamline-flex:user-collaborate-group-solid',
  'collaboration-accepted': 'streamline-flex:check-square-solid',
  'product-update': 'streamline-flex:shipping-box-2-solid',
  'price-drop': 'streamline-flex:wallet-solid',
  system: 'streamline-flex:bell-notification-solid',
  'gift-received': 'streamline-flex:gift-2-solid',
  review: 'streamline-flex:star-circle-solid',
  /** 5-star row (filled vs muted empty). */
  'star-filled': 'streamline-flex:star-1-solid',
  'star-empty': 'streamline-flex:star-1',
  settlement: 'streamline-flex:wallet-solid',

  // Activity types
  sale: 'streamline-flex:wallet-solid',
  collaboration: 'streamline-flex:user-collaborate-group-solid',
  'product-edit': 'streamline-flex:pencil-square-solid',
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
