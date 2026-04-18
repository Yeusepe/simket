/**
 * Purpose: Tests for the checkout state machine hook.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/domain-model.md (Order, CheckoutFlow)
 * External references:
 *   - https://react.dev/reference/react/useState
 * Tests:
 *   - packages/storefront/src/components/checkout/use-checkout.test.ts
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCheckout } from './use-checkout';

describe('useCheckout', () => {
  beforeEach(() => {
    // no-op placeholder for future shared state reset if needed
  });

  it('initial state is review', () => {
    const { result } = renderHook(() => useCheckout());

    expect(result.current.state).toEqual({
      step: 'review',
      isProcessing: false,
    });
  });

  it('goToPayment transitions to payment', () => {
    const { result } = renderHook(() => useCheckout());

    act(() => {
      result.current.goToPayment();
    });

    expect(result.current.state.step).toBe('payment');
    expect(result.current.state.error).toBeUndefined();
  });

  it('goBack returns from payment to review', () => {
    const { result } = renderHook(() => useCheckout());

    act(() => {
      result.current.goToPayment();
      result.current.goBack();
    });

    expect(result.current.state.step).toBe('review');
  });

  it('processPayment transitions from payment to confirmation', async () => {
    const { result } = renderHook(() => useCheckout());

    act(() => {
      result.current.goToPayment();
    });

    await act(async () => {
      await result.current.processPayment('order_123');
    });

    expect(result.current.state.step).toBe('confirmation');
    expect(result.current.state.orderId).toBe('order_123');
    expect(result.current.state.isProcessing).toBe(false);
  });

  it('cannot skip steps', async () => {
    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      await result.current.processPayment('order_123');
    });

    expect(result.current.state.step).toBe('review');
    expect(result.current.state.error).toMatch(/payment step/i);
  });

  it('cannot go backward from confirmation', async () => {
    const { result } = renderHook(() => useCheckout());

    act(() => {
      result.current.goToPayment();
    });

    await act(async () => {
      await result.current.processPayment('order_456');
    });

    act(() => {
      result.current.goBack();
    });

    expect(result.current.state.step).toBe('confirmation');
  });

  it('handles invalid payment identifiers as errors', async () => {
    const { result } = renderHook(() => useCheckout());

    act(() => {
      result.current.goToPayment();
    });

    await act(async () => {
      await result.current.processPayment('');
    });

    expect(result.current.state.step).toBe('payment');
    expect(result.current.state.error).toMatch(/order id/i);
  });

  it('reset returns to the initial state', async () => {
    const { result } = renderHook(() => useCheckout());

    act(() => {
      result.current.goToPayment();
    });

    await act(async () => {
      await result.current.processPayment('order_789');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual({
      step: 'review',
      isProcessing: false,
    });
  });
});
