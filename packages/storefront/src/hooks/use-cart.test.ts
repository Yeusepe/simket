/**
 * Tests for useCart hook — bundle pricing, dependency validation, and shared cart state.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/domain-model.md (§4.2 Bundle, §4.3 ProductDependency)
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
    expect(result.current.cart.bundleGroups).toHaveLength(0);
    expect(result.current.cart.totalItems).toBe(0);
    expect(result.current.cart.subtotal).toBe(0);
    expect(result.current.cart.currencyCode).toBe('USD');
    expect(result.current.cart.dependencyValidation.canCheckout).toBe(true);
  });

  it('addItem adds a new item to the cart', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(makeCartItem({ name: 'Digital Art Pack', price: 1999 }));
    });

    expect(result.current.cart.items).toHaveLength(1);
    expect(result.current.cart.items[0]!.name).toBe('Digital Art Pack');
    expect(result.current.cart.items[0]!.effectivePrice).toBe(1999);
  });

  it('addItem increments quantity when the same standalone line is added twice', () => {
    const { result } = renderHook(() => useCart());
    const item = makeCartItem({ lineId: 'same-line', variantId: 'same-line' });

    act(() => {
      result.current.addItem(item);
      result.current.addItem(item);
    });

    expect(result.current.cart.items).toHaveLength(1);
    expect(result.current.cart.items[0]!.quantity).toBe(2);
  });

  it('addBundle adds all bundle items and tracks grouped savings', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addBundle({
        bundleId: 'complete-pack',
        name: 'Complete Pack',
        discountPercent: 20,
        products: [
          {
            productId: 'base',
            variantId: 'base-v1',
            name: 'Base Package',
            price: 2000,
            currencyCode: 'USD',
            heroImageUrl: null,
            slug: 'base-package',
          },
          {
            productId: 'addon',
            variantId: 'addon-v1',
            name: 'Add-on Pack',
            price: 3000,
            currencyCode: 'USD',
            heroImageUrl: null,
            slug: 'add-on-pack',
          },
        ],
      });
    });

    expect(result.current.cart.items).toHaveLength(2);
    expect(result.current.cart.bundleGroups).toHaveLength(1);
    expect(result.current.cart.bundleGroups[0]!.name).toBe('Complete Pack');
    expect(result.current.cart.bundleGroups[0]!.bundleDiscountTotal).toBe(1000);
    expect(result.current.cart.subtotal).toBe(4000);
  });

  it('flags unmet dependency requirements before checkout', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(makeCartItem({
        productId: 'pro-addon',
        variantId: 'pro-addon-v1',
        name: 'Pro Add-on',
        price: 3000,
      }), {
        dependencyRequirements: [{
          requiredProductId: 'base',
          requiredVariantId: 'base-v1',
          requiredProductName: 'Base Package',
          requiredProductSlug: 'base-package',
          requiredProductPrice: 1500,
          currencyCode: 'USD',
          requiredProductHeroImageUrl: null,
          discountPercent: 10,
          message: 'Requires Base Package.',
        }],
      });
    });

    expect(result.current.cart.dependencyValidation.canCheckout).toBe(false);
    expect(result.current.cart.dependencyValidation.issues[0]!.productName).toBe('Pro Add-on');
  });

  it('applies dependency discounts when the prerequisite is already owned', () => {
    const { result } = renderHook(() => useCart({ ownedProductIds: ['base'] }));

    act(() => {
      result.current.addItem(makeCartItem({
        productId: 'pro-addon',
        variantId: 'pro-addon-v1',
        name: 'Pro Add-on',
        price: 3000,
      }), {
        dependencyRequirements: [{
          requiredProductId: 'base',
          requiredVariantId: 'base-v1',
          requiredProductName: 'Base Package',
          requiredProductSlug: 'base-package',
          requiredProductPrice: 1500,
          currencyCode: 'USD',
          requiredProductHeroImageUrl: null,
          discountPercent: 10,
        }],
      });
    });

    expect(result.current.cart.items[0]!.effectivePrice).toBe(2700);
    expect(result.current.cart.dependencyDiscountTotal).toBe(300);
    expect(result.current.cart.dependencyValidation.canCheckout).toBe(true);
  });

  it('addPrerequisite resolves checkout blockers and unlocks the dependency discount', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(makeCartItem({
        productId: 'pro-addon',
        variantId: 'pro-addon-v1',
        name: 'Pro Add-on',
        price: 3000,
      }), {
        dependencyRequirements: [{
          requiredProductId: 'base',
          requiredVariantId: 'base-v1',
          requiredProductName: 'Base Package',
          requiredProductSlug: 'base-package',
          requiredProductPrice: 1500,
          currencyCode: 'USD',
          requiredProductHeroImageUrl: null,
          discountPercent: 25,
        }],
      });
    });

    act(() => {
      result.current.addPrerequisite(result.current.cart.dependencyValidation.issues[0]!.missingRequirements[0]!);
    });

    expect(result.current.cart.items).toHaveLength(2);
    expect(result.current.cart.dependencyValidation.canCheckout).toBe(true);
    expect(result.current.cart.items.find((item) => item.productId === 'pro-addon')!.effectivePrice).toBe(2250);
  });

  it('removeItem removes a standalone line by line identifier', () => {
    const { result } = renderHook(() => useCart());
    const item = makeCartItem({ lineId: 'remove-me', variantId: 'v-remove-me' });

    act(() => {
      result.current.addItem(item);
    });

    act(() => {
      result.current.removeItem('remove-me');
    });

    expect(result.current.cart.items).toHaveLength(0);
  });

  it('removeItem removes a whole bundle when passed the bundle instance identifier', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addBundle({
        bundleId: 'complete-pack',
        name: 'Complete Pack',
        discountPercent: 20,
        products: [
          {
            productId: 'base',
            variantId: 'base-v1',
            name: 'Base Package',
            price: 2000,
            currencyCode: 'USD',
            heroImageUrl: null,
            slug: 'base-package',
          },
          {
            productId: 'addon',
            variantId: 'addon-v1',
            name: 'Add-on Pack',
            price: 3000,
            currencyCode: 'USD',
            heroImageUrl: null,
            slug: 'add-on-pack',
          },
        ],
      });
    });

    act(() => {
      result.current.removeItem(result.current.cart.bundleGroups[0]!.instanceId);
    });

    expect(result.current.cart.items).toHaveLength(0);
  });

  it('updateQuantity updates item quantity', () => {
    const { result } = renderHook(() => useCart());
    const item = makeCartItem({ lineId: 'qty-line', variantId: 'v-qty' });

    act(() => {
      result.current.addItem(item);
    });
    act(() => {
      result.current.updateQuantity('qty-line', 5);
    });

    expect(result.current.cart.items[0]!.quantity).toBe(5);
  });

  it('clearCart empties the cart', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addItem(makeCartItem());
      result.current.addItem(makeCartItem());
    });

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cart.items).toHaveLength(0);
    expect(result.current.cart.totalItems).toBe(0);
    expect(result.current.cart.subtotal).toBe(0);
  });
});
