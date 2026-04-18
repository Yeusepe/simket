/**
 * Purpose: Checkout page orchestrator for cart review, payment, and confirmation.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/service-architecture.md (Storefront -> Stripe payment handoff)
 * External references:
 *   - https://docs.stripe.com/payments/payment-element
 * Tests:
 *   - packages/storefront/src/components/checkout/CheckoutPage.test.tsx
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrderSummary } from './checkout-types';
import { CartReview } from './CartReview';
import { OrderConfirmation } from './OrderConfirmation';
import { PaymentForm } from './PaymentForm';
import { useCheckout } from './use-checkout';
import { useCart } from '../../hooks/use-cart';

export interface CheckoutPageProps {
  readonly platformFeeRate?: number;
  readonly stripePublishableKey?: string;
  readonly clientSecret?: string;
  readonly returnUrl?: string;
  readonly createOrderSummary: (paymentIntentId: string) => Promise<OrderSummary>;
  readonly onContinueShopping?: () => void;
  readonly onGoToLibrary?: () => void;
  readonly ownedProductIds?: readonly string[];
}

export function CheckoutPage({
  platformFeeRate = 0.05,
  stripePublishableKey,
  clientSecret,
  returnUrl,
  createOrderSummary,
  onContinueShopping,
  onGoToLibrary,
  ownedProductIds = [],
}: CheckoutPageProps) {
  const navigate = useNavigate();
  const checkout = useCheckout();
  const { cart, clearCart } = useCart({ ownedProductIds });
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);

  const amount = useMemo(
    () => cart.subtotal + Math.round(cart.subtotal * platformFeeRate),
    [cart.subtotal, platformFeeRate],
  );

  async function handlePaymentSuccess(paymentIntentId: string) {
    try {
      const summary = await createOrderSummary(paymentIntentId);
      setOrderSummary(summary);
      await checkout.processPayment(summary.orderId);
      clearCart();
    } catch (caughtError) {
      checkout.setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to finalize order.',
      );
    }
  }

  if (checkout.state.step === 'payment') {
    return (
        <PaymentForm
          amount={amount}
          currency={cart.currencyCode}
        publishableKey={stripePublishableKey}
        clientSecret={clientSecret}
        returnUrl={returnUrl}
        error={checkout.state.error}
        onBack={checkout.goBack}
        onPaymentSuccess={handlePaymentSuccess}
      />
    );
  }

  if (checkout.state.step === 'confirmation' && orderSummary) {
    return (
      <OrderConfirmation
        orderSummary={orderSummary}
        onContinueShopping={onContinueShopping ?? (() => navigate('/'))}
        onGoToLibrary={onGoToLibrary ?? (() => navigate('/library'))}
      />
    );
  }

  if (checkout.state.step === 'confirmation' && !orderSummary) {
    checkout.reset();
  }

  return (
    <CartReview
      onProceed={checkout.goToPayment}
      platformFeeRate={platformFeeRate}
      ownedProductIds={ownedProductIds}
    />
  );
}
