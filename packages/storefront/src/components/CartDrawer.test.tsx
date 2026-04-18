/**
 * Tests for CartDrawer component.
 * Governing docs:
 *   - docs/architecture.md (§6.1 Storefront)
 * External references:
 *   - https://heroui.com/docs/components/drawer
 *   - https://heroui.com/docs/components/card
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CartDrawer } from './CartDrawer';
import { makeCartItem, resetCartCounter } from '../types/cart.factory';
import type { CartItem } from '../types/cart';

function renderDrawer(items: CartItem[] = []) {
  const noop = () => {};
  return render(
    <MemoryRouter>
      <CartDrawer
        items={items}
        onRemoveItem={noop}
        onUpdateQuantity={noop}
        onCheckout={noop}
      />
    </MemoryRouter>,
  );
}

describe('CartDrawer', () => {
  beforeEach(() => {
    resetCartCounter();
  });

  it('shows "Your cart is empty" when no items', () => {
    renderDrawer([]);
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
  });

  it('renders cart items with name and price', () => {
    const items = [
      makeCartItem({ name: 'Digital Art Pack', price: 1999, currencyCode: 'USD' }),
      makeCartItem({ name: 'Music Bundle', price: 4999, currencyCode: 'USD' }),
    ];
    renderDrawer(items);

    expect(screen.getByText('Digital Art Pack')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('Music Bundle')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  it('shows formatted subtotal', () => {
    const items = [
      makeCartItem({ price: 1000, quantity: 2, currencyCode: 'USD' }),
      makeCartItem({ price: 500, quantity: 1, currencyCode: 'USD' }),
    ];
    renderDrawer(items);

    // 1000*2 + 500*1 = 2500 cents = $25.00
    expect(screen.getByText('$25.00')).toBeInTheDocument();
  });

  it('has a checkout button', () => {
    const items = [makeCartItem()];
    renderDrawer(items);

    expect(screen.getByRole('button', { name: /checkout/i })).toBeInTheDocument();
  });

  it('has a remove button for each item', () => {
    const items = [
      makeCartItem({ name: 'Item One' }),
      makeCartItem({ name: 'Item Two' }),
    ];
    renderDrawer(items);

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(2);
  });

  it('does not show checkout button when cart is empty', () => {
    renderDrawer([]);
    expect(screen.queryByRole('button', { name: /checkout/i })).not.toBeInTheDocument();
  });

  it('renders item quantity', () => {
    const items = [makeCartItem({ quantity: 3 })];
    renderDrawer(items);

    expect(screen.getByText('Qty: 3')).toBeInTheDocument();
  });

  it('renders item image when heroImageUrl is provided', () => {
    const items = [
      makeCartItem({ name: 'Art Pack', heroImageUrl: 'https://cdn.example.com/art.webp' }),
    ];
    renderDrawer(items);

    const img = screen.getByRole('img', { name: 'Art Pack' });
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/art.webp');
  });
});
