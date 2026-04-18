/**
 * Tests for useCart hook — pure cart state management logic.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 *   - docs/domain-model.md (Product dependency rules)
 * External references:
 *   - https://docs.vendure.io/reference/graphql-api/shop/object-types/#orderline
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart } from './use-cart';
import { makeCartItem, resetCartCounter } from '../types/cart.factory';
import { resetCartState } from '../state/cart-state';

describe('useCart', () => {
  beforeEach(() => {
    resetCartCounter();
    resetCartState();
  });

  it('initial cart is empty', () => {
    const { result } = renderHook(() => useCart());

    expect(result.current.cart.items).toHaveLength(0);
    expect(result.current.cart.totalItems).toBe(0);
    expect(result.current.cart.subtotal).toBe(0);
    expect(result.current.cart.currencyCode).toBe('USD');
  });

  it('addItem adds a new item to the cart', () => {
    const { result } = renderHook(() => useCart());
    const item = makeCartItem({ name: 'Digital Art Pack', price: 1999 });

    act(() => {
      result.current.addItem(item);
    });

    expect(result.current.cart.items).toHaveLength(1);
    expect(result.current.cart.items[0]!.name).toBe('Digital Art Pack');
    expect(result.current.cart.items[0]!.price).toBe(1999);
    expect(result.current.cart.items[0]!.quantity).toBe(1);
  });

  it('addItem increments quantity if item already exists (same variantId)', () => {
    const { result } = renderHook(() => useCart());
    const item = makeCartItem({ variantId: 'v-1', quantity: 1 });

    act(() => {
      result.current.addItem(item);
    });
    act(() => {
      result.current.addItem(item);
    });

    expect(result.current.cart.items).toHaveLength(1);
    expect(result.current.cart.items[0]!.quantity).toBe(2);
  });

  it('addItem rejects when required product is not in cart', () => {
    const { result } = renderHook(() => useCart());
    const item = makeCartItem({ productId: 'p-addon' });

    expect(() => {
      act(() => {
        result.current.addItem(item, { requiredProductIds: ['p-base'] });
      });
    }).toThrow('Required products missing from cart: p-base');
  });

  it('addItem succeeds when required product IS in cart', () => {
    const { result } = renderHook(() => useCart());
    const baseItem = makeCartItem({ productId: 'p-base' });
    const addonItem = makeCartItem({ productId: 'p-addon' });

    act(() => {
      result.current.addItem(baseItem);
    });
    act(() => {
      result.current.addItem(addonItem, { requiredProductIds: ['p-base'] });
    });

    expect(result.current.cart.items).toHaveLength(2);
  });

  it('removeItem removes an item by variantId', () => {
    const { result } = renderHook(() => useCart());
    const item = makeCartItem({ variantId: 'v-remove-me' });

    act(() => {
      result.current.addItem(item);
    });
    expect(result.current.cart.items).toHaveLength(1);

    act(() => {
      result.current.removeItem('v-remove-me');
    });
    expect(result.current.cart.items).toHaveLength(0);
  });

  it('updateQuantity updates item quantity', () => {
    const { result } = renderHook(() => useCart());
    const item = makeCartItem({ variantId: 'v-qty' });

    act(() => {
      result.current.addItem(item);
    });
    act(() => {
      result.current.updateQuantity('v-qty', 5);
    });

    expect(result.current.cart.items[0]!.quantity).toBe(5);
  });

  it('updateQuantity removes item when quantity is set to 0', () => {
    const { result } = renderHook(() => useCart());
    const item = makeCartItem({ variantId: 'v-zero' });

    act(() => {
      result.current.addItem(item);
    });
    act(() => {
      result.current.updateQuantity('v-zero', 0);
    });

    expect(result.current.cart.items).toHaveLength(0);
  });

  it('clearCart empties the cart', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(makeCartItem());
      result.current.addItem(makeCartItem());
    });
    expect(result.current.cart.items).toHaveLength(2);

    act(() => {
      result.current.clearCart();
    });
    expect(result.current.cart.items).toHaveLength(0);
    expect(result.current.cart.totalItems).toBe(0);
    expect(result.current.cart.subtotal).toBe(0);
  });

  it('subtotal correctly sums price * quantity for all items', () => {
    const { result } = renderHook(() => useCart());
    const item1 = makeCartItem({ variantId: 'v-a', price: 1000, quantity: 2 });
    const item2 = makeCartItem({ variantId: 'v-b', price: 500, quantity: 3 });

    act(() => {
      result.current.addItem(item1);
      result.current.addItem(item2);
    });

    // 1000*2 + 500*3 = 3500
    expect(result.current.cart.subtotal).toBe(3500);
  });

  it('totalItems correctly counts total quantity across all items', () => {
    const { result } = renderHook(() => useCart());
    const item1 = makeCartItem({ variantId: 'v-c', quantity: 2 });
    const item2 = makeCartItem({ variantId: 'v-d', quantity: 3 });

    act(() => {
      result.current.addItem(item1);
      result.current.addItem(item2);
    });

    expect(result.current.cart.totalItems).toBe(5);
  });
});
