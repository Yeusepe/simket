/**
 * Purpose: Stripe Payment Element step for confirming checkout payments.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/service-architecture.md (Checkout -> Stripe)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://docs.stripe.com/sdks/stripejs-react
 *   - https://docs.stripe.com/payments/payment-element
 *   - https://stripe.com/docs/js/payment_intents/confirm_payment
 * Tests:
 *   - packages/storefront/src/components/checkout/PaymentForm.test.tsx
 */
import { Button, Card, Spinner } from '@heroui/react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useMemo, useState } from 'react';
import { formatPrice } from '../ProductCard';

const stripePromiseCache = new Map<string, Promise<Stripe | null>>();

function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  const cached = stripePromiseCache.get(publishableKey);
  if (cached) {
    return cached;
  }

  const stripePromise = loadStripe(publishableKey);
  stripePromiseCache.set(publishableKey, stripePromise);
  return stripePromise;
}

export interface PaymentFormProps {
  readonly amount: number;
  readonly currency: string;
  readonly publishableKey?: string;
  readonly clientSecret?: string;
  readonly returnUrl?: string;
  readonly error?: string;
  readonly onBack: () => void;
  readonly onPaymentSuccess: (paymentIntentId: string) => Promise<void> | void;
}

export function PaymentForm({
  amount,
  currency,
  publishableKey,
  clientSecret,
  returnUrl,
  error,
  onBack,
  onPaymentSuccess,
}: PaymentFormProps) {
  const configurationError = error
    ?? (!publishableKey || !clientSecret || !returnUrl
      ? 'Stripe payment is not configured for this checkout session.'
      : undefined);

  if (!publishableKey || !clientSecret || !returnUrl) {
    return (
      <PaymentShell amount={amount} currency={currency} onBack={onBack} error={configurationError}>
        <div className="flex min-h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </PaymentShell>
    );
  }

  return (
    <Elements
      stripe={getStripePromise(publishableKey)}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
        },
      }}
    >
      <PaymentFormInner
        amount={amount}
        currency={currency}
        clientSecret={clientSecret}
        returnUrl={returnUrl}
        error={configurationError}
        onBack={onBack}
        onPaymentSuccess={onPaymentSuccess}
      />
    </Elements>
  );
}

interface PaymentFormInnerProps {
  readonly amount: number;
  readonly currency: string;
  readonly clientSecret: string;
  readonly returnUrl: string;
  readonly error?: string;
  readonly onBack: () => void;
  readonly onPaymentSuccess: (paymentIntentId: string) => Promise<void> | void;
}

function PaymentFormInner({
  amount,
  currency,
  clientSecret,
  returnUrl,
  error,
  onBack,
  onPaymentSuccess,
}: PaymentFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const payLabel = useMemo(
    () => `Pay ${formatPrice(amount, currency)}`,
    [amount, currency],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) {
      setLocalError('Stripe has not finished loading. Please try again.');
      return;
    }

    setLocalError(undefined);
    setIsSubmitting(true);

    try {
      const submitResult = await elements.submit();
      if (submitResult?.error) {
        setLocalError(submitResult.error.message);
        return;
      }

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        setLocalError(result.error.message ?? 'Payment could not be confirmed.');
        return;
      }

      if (!result.paymentIntent?.id) {
        setLocalError('Stripe did not return a payment intent identifier.');
        return;
      }

      await onPaymentSuccess(result.paymentIntent.id);
    } catch (caughtError) {
      setLocalError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Payment could not be completed.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PaymentShell
      amount={amount}
      currency={currency}
      onBack={onBack}
      error={localError ?? error}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-xl border border-divider p-4">
          <PaymentElement />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" className="sm:flex-1" onPress={onBack}>
            Back to cart
          </Button>
          <Button
            variant="primary"
            className="sm:flex-1"
            type="submit"
            isDisabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" />
                Processing…
              </span>
            ) : payLabel}
          </Button>
        </div>
      </form>
    </PaymentShell>
  );
}

function PaymentShell({
  amount,
  currency,
  onBack,
  error,
  children,
}: {
  readonly amount: number;
  readonly currency: string;
  readonly onBack: () => void;
  readonly error?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Card>
        <Card.Header>
          <Card.Title>Payment</Card.Title>
          <Card.Description>
            Secure checkout for {formatPrice(amount, currency)}
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-4">
          {error ? (
            <div role="alert" className="rounded-lg border border-danger bg-danger/10 p-3 text-danger">
              {error}
            </div>
          ) : null}
          {children}
        </Card.Content>
        {!children ? (
          <Card.Footer>
            <Button variant="secondary" onPress={onBack}>
              Back to cart
            </Button>
          </Card.Footer>
        ) : null}
      </Card>
    </div>
  );
}
