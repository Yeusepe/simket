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
import { useCartState } from '../../state/cart-state';
import {
  readStoredExperimentAssignment,
  type ExperimentEventPayload,
} from '../../hooks/useExperimentVariant';

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

export interface UseCheckoutOptions {
  readonly trackExperimentEvent?: (payload: ExperimentEventPayload) => Promise<void>;
}

export function useCheckout(options: UseCheckoutOptions = {}): UseCheckoutResult {
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

    if (options.trackExperimentEvent) {
      const cartItems = useCartState.getState().items;
      for (const item of cartItems) {
        const assignment = readStoredExperimentAssignment(item.productId);
        if (!assignment) {
          continue;
        }

        await options.trackExperimentEvent({
          experimentId: assignment.experimentId,
          variantName: assignment.variantName,
          productId: item.productId,
          event: 'purchase',
        });
      }
    }

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
