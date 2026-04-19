/**
 * Purpose: Toggle wishlist membership from product cards and detail pages.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/docs/react/components/button
 *   - https://tanstack.com/query/latest/docs/framework/react/overview
 * Tests:
 *   - packages/storefront/src/components/wishlist/WishlistButton.test.tsx
 */
import { Button } from '@heroui/react';
import type { WishlistApi } from '../../types/wishlist';
import { useWishlist } from '../../hooks/useWishlist';
import { Icon } from '../common/Icon';

interface WishlistButtonProps {
  readonly api?: WishlistApi;
  readonly productId: string;
  readonly notifyOnPriceDrop?: boolean;
  readonly className?: string;
}

export function WishlistButton({
  api,
  productId,
  notifyOnPriceDrop = false,
  className,
}: WishlistButtonProps) {
  const {
    currentProductInWishlist,
    isMutating,
    toggleWishlist,
  } = useWishlist({ api, productId });

  return (
    <Button
      aria-label={currentProductInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      className={className}
      isIconOnly
      isPending={isMutating}
      variant={currentProductInWishlist ? 'secondary' : 'ghost'}
      onPress={() => void toggleWishlist(productId, notifyOnPriceDrop)}
    >
      <Icon name={currentProductInWishlist ? 'heart-filled' : 'heart-outline'} size={20} />
    </Button>
  );
}
