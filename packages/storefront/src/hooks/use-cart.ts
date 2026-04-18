/**
 * Purpose: Cart state management hook — manages items, quantities, and derived totals.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 *   - docs/domain-model.md (Product dependency rules, pricing in minor units)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#orderline
 * Tests:
 *   - packages/storefront/src/hooks/use-cart.test.ts
 */
import { useCallback, useMemo } from 'react';
import { useCartState } from '../state/cart-state';
import type { Cart, CartItem } from '../types/cart';

/** Options for addItem — allows dependency checking before adding. */
export interface AddItemOptions {
  /** Product IDs that must already be in the cart before this item can be added. */
  readonly requiredProductIds?: readonly string[];
}

export interface UseCartReturn {
  readonly cart: Cart;
  readonly addItem: (item: CartItem, options?: AddItemOptions) => void;
  readonly removeItem: (variantId: string) => void;
  readonly updateQuantity: (variantId: string, quantity: number) => void;
  readonly clearCart: () => void;
}

export function useCart(): UseCartReturn {
  const items = useCartState((state) => state.items);
  const addStoredItem = useCartState((state) => state.addItem);
  const removeStoredItem = useCartState((state) => state.removeItem);
  const updateStoredQuantity = useCartState((state) => state.updateQuantity);
  const clearStoredCart = useCartState((state) => state.clearCart);

  const addItem = useCallback((item: CartItem, options?: AddItemOptions) => {
    // Dependency check: ensure all required products are already in the cart
    if (options?.requiredProductIds && options.requiredProductIds.length > 0) {
      const productIdsInCart = new Set(items.map((entry) => entry.productId));
      const missing = options.requiredProductIds.filter(
        (id) => !productIdsInCart.has(id),
      );
      if (missing.length > 0) {
        throw new Error(`Required products missing from cart: ${missing.join(', ')}`);
      }
    }

    addStoredItem(item);
  }, [addStoredItem, items]);

  const removeItem = useCallback((variantId: string) => {
    removeStoredItem(variantId);
  }, [removeStoredItem]);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    updateStoredQuantity(variantId, quantity);
  }, [updateStoredQuantity]);

  const clearCart = useCallback(() => {
    clearStoredCart();
  }, [clearStoredCart]);

  const cart = useMemo<Cart>(() => {
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const firstItem = items[0];
    const currencyCode = firstItem ? firstItem.currencyCode : 'USD';
    return { items, totalItems, subtotal, currencyCode };
  }, [items]);

  return { cart, addItem, removeItem, updateQuantity, clearCart };
}
