/**
 * Purpose: Shared cart state for the storefront using Zustand so cart review,
 *   product pages, and checkout share one source of truth.
 * Governing docs:
 *   - docs/architecture.md (§2 non-negotiable rules, §6.2 Purchase flow)
 *   - docs/domain-model.md (OrderLine pricing in minor units)
 * External references:
 *   - https://zustand.docs.pmnd.rs/
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#orderline
 * Tests:
 *   - packages/storefront/src/hooks/use-cart.test.ts
 *   - packages/storefront/src/components/checkout/CartReview.test.tsx
 */
import { create } from 'zustand';
import type { CartItem } from '../types/cart';

interface CartStateData {
  readonly items: readonly CartItem[];
  readonly totalItems: number;
  readonly subtotal: number;
  readonly currencyCode: string;
}

interface CartStateActions {
  readonly addItem: (item: CartItem) => void;
  readonly removeItem: (variantId: string) => void;
  readonly updateQuantity: (variantId: string, quantity: number) => void;
  readonly clearCart: () => void;
}

export type CartState = CartStateData & CartStateActions;

const INITIAL_CART_STATE: CartStateData = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  currencyCode: 'USD',
};

function buildCartState(items: readonly CartItem[]): CartStateData {
  return {
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    currencyCode: items[0]?.currencyCode ?? 'USD',
  };
}

export const useCartState = create<CartState>((set) => ({
  ...INITIAL_CART_STATE,
  addItem: (item) => {
    set((current) => {
      const existing = current.items.find((entry) => entry.variantId === item.variantId);
      const items = existing
        ? current.items.map((entry) =>
            entry.variantId === item.variantId
              ? { ...entry, quantity: entry.quantity + item.quantity }
              : entry,
          )
        : [...current.items, item];

      return buildCartState(items);
    });
  },
  removeItem: (variantId) => {
    set((current) => buildCartState(current.items.filter((item) => item.variantId !== variantId)));
  },
  updateQuantity: (variantId, quantity) => {
    set((current) => {
      const items = quantity <= 0
        ? current.items.filter((item) => item.variantId !== variantId)
        : current.items.map((item) =>
            item.variantId === variantId ? { ...item, quantity } : item,
          );

      return buildCartState(items);
    });
  },
  clearCart: () => {
    set(INITIAL_CART_STATE);
  },
}));

export function resetCartState(): void {
  useCartState.setState(INITIAL_CART_STATE);
}
