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
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
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
  const { session, isVendureReady } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentProductInWishlist,
    isMutating,
    toggleWishlist,
  } = useWishlist({ api, productId, enabled: Boolean(session && isVendureReady) });

  const isDisabled = Boolean(session) && !isVendureReady;

  return (
    <Button
      aria-label={currentProductInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      className={className}
      isDisabled={isDisabled}
      isIconOnly
      isPending={isMutating}
      variant={currentProductInWishlist ? 'secondary' : 'ghost'}
      onPress={() => {
        if (!session) {
          navigate('/sign-in', {
            state: {
              from: location.pathname,
            },
          });
          return;
        }

        if (!isVendureReady) {
          return;
        }

        void toggleWishlist(productId, notifyOnPriceDrop);
      }}
    >
      <Icon name={currentProductInWishlist ? 'heart-filled' : 'heart-outline'} size={20} />
    </Button>
  );
}
