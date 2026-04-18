/**
 * Purpose: Buyer checkout page entry point.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/service-architecture.md (Storefront -> Stripe)
 * External references:
 *   - https://docs.stripe.com/payments/payment-element
 * Tests:
 *   - packages/storefront/src/components/checkout/CheckoutPage.test.tsx
 */
import { CheckoutPage } from '../components/checkout';

export function CartPage() {
  return (
    <CheckoutPage
      stripePublishableKey={import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY}
      clientSecret={import.meta.env.VITE_STRIPE_CLIENT_SECRET}
      returnUrl={import.meta.env.VITE_STRIPE_RETURN_URL}
      createOrderSummary={async () => {
        throw new Error(
          'Order finalization is not connected yet. Pass a real createOrderSummary implementation from the storefront payment integration.',
        );
      }}
    />
  );
}
