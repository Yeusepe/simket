/**
 * Purpose: Checkout state machine for review, payment, and confirmation.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/domain-model.md (CheckoutFlow, Order)
 * External references:
 *   - https://react.dev/reference/react/useState
 * Tests:
 *   - packages/storefront/src/components/checkout/use-checkout.test.ts
 */
import { useCallback, useState } from 'react';
import type { CheckoutState } from './checkout-types';

const INITIAL_CHECKOUT_STATE: CheckoutState = {
  step: 'review',
  isProcessing: false,
};

export interface UseCheckoutResult {
  readonly state: CheckoutState;
  readonly goToPayment: () => void;
  readonly goBack: () => void;
  readonly processPayment: (orderId: string) => Promise<void>;
  readonly reset: () => void;
  readonly setError: (error?: string) => void;
}

export function useCheckout(): UseCheckoutResult {
  const [state, setState] = useState<CheckoutState>(INITIAL_CHECKOUT_STATE);

  const goToPayment = useCallback(() => {
    setState((current) =>
      current.step === 'review'
        ? { ...current, step: 'payment', error: undefined }
        : current,
    );
  }, []);

  const goBack = useCallback(() => {
    setState((current) => {
      if (current.isProcessing || current.step === 'confirmation') {
        return current;
      }

      return current.step === 'payment'
        ? { ...current, step: 'review', error: undefined }
        : current;
    });
  }, []);

  const processPayment = useCallback(async (orderId: string) => {
    setState((current) => {
      if (current.step !== 'payment') {
        return {
          ...current,
          error: 'Payment can only be processed from the payment step.',
        };
      }

      if (orderId.trim().length === 0) {
        return {
          ...current,
          error: 'A valid order ID is required to complete checkout.',
        };
      }

      return {
        ...current,
        error: undefined,
        isProcessing: true,
      };
    });

    await Promise.resolve();

    setState((current) => {
      if (current.step !== 'payment' || current.error) {
        return {
          ...current,
          isProcessing: false,
        };
      }

      return {
        step: 'confirmation',
        orderId,
        isProcessing: false,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_CHECKOUT_STATE);
  }, []);

  const setError = useCallback((error?: string) => {
    setState((current) => ({
      ...current,
      error,
      isProcessing: false,
    }));
  }, []);

  return {
    state,
    goToPayment,
    goBack,
    processPayment,
    reset,
    setError,
  };
}
