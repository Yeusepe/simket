/**
 * Test factories for cart types — consistent test data generation.
 */
import type { CartItem } from './cart';

let _counter = 0;

export function makeCartItem(
  overrides: Partial<CartItem> = {},
): CartItem {
  _counter++;
  return {
    lineId: `line-${_counter}`,
    productId: `product-${_counter}`,
    variantId: `variant-${_counter}`,
    name: `Test Cart Item ${_counter}`,
    basePrice: 999,
    price: 999,
    currencyCode: 'USD',
    quantity: 1,
    heroImageUrl: `https://cdn.example.com/products/${_counter}/hero.webp`,
    slug: `test-cart-item-${_counter}`,
    ...overrides,
  };
}

/** Reset the counter between tests for deterministic IDs. */
export function resetCartCounter(): void {
  _counter = 0;
}
