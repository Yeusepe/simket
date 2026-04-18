/**
 * Purpose: Cart drawer component — displays cart items with quantities, prices,
 *   and a checkout action. Used inline (not as an overlay) for testability; the
 *   Drawer overlay wrapper lives in the parent layout.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 *   - docs/domain-model.md (Product entity — pricing in minor units)
 * External references:
 *   - https://heroui.com/docs/components/card
 *   - https://heroui.com/docs/components/button
 *   - https://heroui.com/docs/components/drawer
 * Tests:
 *   - packages/storefront/src/components/CartDrawer.test.tsx
 */
import { Button, Card } from '@heroui/react';
import { formatPrice } from './ProductCard';
import type { CartItem } from '../types/cart';

export interface CartDrawerProps {
  readonly items: readonly CartItem[];
  readonly onRemoveItem: (variantId: string) => void;
  readonly onUpdateQuantity: (variantId: string, quantity: number) => void;
  readonly onCheckout: () => void;
}

export function CartDrawer({
  items,
  onRemoveItem,
  onUpdateQuantity: _onUpdateQuantity,
  onCheckout,
}: CartDrawerProps) {
  // Reserved for future quantity stepper controls
  void _onUpdateQuantity;

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const firstItem = items[0];
  const currencyCode = firstItem ? firstItem.currencyCode : 'USD';

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-muted-foreground">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Cart items */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {items.map((item) => (
          <Card key={item.variantId} className="flex-row gap-3 p-3">
            {/* Image thumbnail */}
            {item.heroImageUrl ? (
              <img
                src={item.heroImageUrl}
                alt={item.name}
                className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                <span className="text-xs text-muted-foreground">No img</span>
              </div>
            )}

            {/* Item details */}
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(item.price, item.currencyCode)}
                </p>
                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${item.name}`}
                  onPress={() => onRemoveItem(item.variantId)}
                >
                  Remove
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Footer with subtotal and checkout */}
      <div className="border-t border-divider p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Subtotal</span>
          <span className="text-lg font-semibold">
            {formatPrice(subtotal, currencyCode)}
          </span>
        </div>
        <Button
          variant="primary"
          className="w-full"
          onPress={onCheckout}
        >
          Checkout
        </Button>
      </div>
    </div>
  );
}
