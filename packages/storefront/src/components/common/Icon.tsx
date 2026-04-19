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
  home: 'streamline-plump:home-1',
  search: 'streamline-plump:search-visual',
  cart: 'streamline-plump:shopping-cart-add',
  library: 'streamline-plump:book-1',
  notifications: 'streamline-plump:ringing-bell-notification',
  profile: 'streamline-plump:user-single-neutral-male',
  settings: 'streamline-plump:cog',
  menu: 'streamline-plump:horizontal-menu-circle',
  close: 'streamline-plump:delete-keyboard',

  // Theme
  sun: 'streamline-plump:sun',
  moon: 'streamline-plump:moon-stars',

  // Actions
  plus: 'streamline-plump:shopping-cart-add',
  edit: 'streamline-plump:pencil-square',
  check: 'streamline-plump:check-thick',
  'arrow-up': 'streamline-plump:arrow-transfer-horizontal-square',
  'arrow-down': 'streamline-plump:arrow-transfer-horizontal-square',

  // Wishlist
  'heart-filled': 'streamline-plump:user-feedback-heart',
  'heart-outline': 'streamline-plump:user-feedback-heart',

  // Dashboard stats
  revenue: 'streamline-plump:wallet',
  sales: 'streamline-plump:shopping-basket-1',
  views: 'streamline-plump:eye-optic',
  conversion: 'streamline-plump:flash-1',

  // Dashboard nav
  products: 'streamline-plump:shipping-box-1',
  licenses: 'streamline-plump:keyhole-lock-circle',
  templates: 'streamline-plump:graphic-template-website-ui',
  collaborations: 'streamline-plump:user-multiple-accounts',
  flows: 'streamline-plump:arrow-transfer-horizontal-square',
  chart: 'streamline-plump:graph-bar-increase',

  // Notification types
  purchase: 'streamline-plump:shopping-basket-1',
  'collaboration-invite': 'streamline-plump:user-multiple-accounts',
  'collaboration-accepted': 'streamline-plump:check-thick',
  'product-update': 'streamline-plump:shipping-box-1',
  'price-drop': 'streamline-plump:wallet',
  system: 'streamline-plump:ringing-bell-notification',
  'gift-received': 'streamline-plump:gift',
  review: 'streamline-plump:star-circle',
  settlement: 'streamline-plump:wallet',

  // Activity types
  sale: 'streamline-plump:wallet',
  collaboration: 'streamline-plump:user-multiple-accounts',
  'product-edit': 'streamline-plump:pencil-square',
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
