/**
 * Purpose: Tests for the Stripe payment form step.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://docs.stripe.com/sdks/stripejs-react
 *   - https://docs.stripe.com/payments/payment-element
 * Tests:
 *   - packages/storefront/src/components/checkout/PaymentForm.test.tsx
 */
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentForm } from './PaymentForm';

const mockLoadStripe = vi.fn();
const mockConfirmPayment = vi.fn();
const mockElements = { submit: vi.fn() };

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: (...args: unknown[]) => mockLoadStripe(...args),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
  PaymentElement: () => <div data-testid="payment-element">Payment Element</div>,
  useStripe: () => ({ confirmPayment: mockConfirmPayment }),
  useElements: () => mockElements,
}));

describe('PaymentForm', () => {
  beforeEach(() => {
    mockLoadStripe.mockReset();
    mockConfirmPayment.mockReset();
    mockElements.submit.mockReset();
    mockLoadStripe.mockResolvedValue({});
  });

  it('renders the payment element and amount button', () => {
    render(
      <PaymentForm
        amount={5500}
        currency="USD"
        publishableKey="pk_test_123"
        clientSecret="pi_secret_123"
        returnUrl="https://example.com/checkout/return"
        onBack={vi.fn()}
        onPaymentSuccess={vi.fn()}
      />,
    );

    expect(screen.getByTestId('payment-element')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pay \$55.00/i })).toBeInTheDocument();
  });

  it('goes back to the review step', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <PaymentForm
        amount={5500}
        currency="USD"
        publishableKey="pk_test_123"
        clientSecret="pi_secret_123"
        returnUrl="https://example.com/checkout/return"
        onBack={onBack}
        onPaymentSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /back to cart/i }));

    expect(onBack).toHaveBeenCalledOnce();
  });

  it('submits payment and reports the payment intent identifier', async () => {
    const user = userEvent.setup();
    const onPaymentSuccess = vi.fn();

    mockConfirmPayment.mockResolvedValue({
      paymentIntent: {
        id: 'pi_123',
        status: 'succeeded',
      },
    });

    render(
      <PaymentForm
        amount={5500}
        currency="USD"
        publishableKey="pk_test_123"
        clientSecret="pi_secret_123"
        returnUrl="https://example.com/checkout/return"
        onBack={vi.fn()}
        onPaymentSuccess={onPaymentSuccess}
      />,
    );

    await user.click(screen.getByRole('button', { name: /pay \$55.00/i }));

    await waitFor(() => {
      expect(mockConfirmPayment).toHaveBeenCalledOnce();
      expect(onPaymentSuccess).toHaveBeenCalledWith('pi_123');
    });
  });

  it('shows Stripe confirmation errors', async () => {
    const user = userEvent.setup();

    mockConfirmPayment.mockResolvedValue({
      error: { message: 'Your card was declined.' },
    });

    render(
      <PaymentForm
        amount={5500}
        currency="USD"
        publishableKey="pk_test_123"
        clientSecret="pi_secret_123"
        returnUrl="https://example.com/checkout/return"
        onBack={vi.fn()}
        onPaymentSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /pay \$55.00/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/declined/i);
  });

  it('renders external payment errors', () => {
    render(
      <PaymentForm
        amount={5500}
        currency="USD"
        publishableKey="pk_test_123"
        clientSecret="pi_secret_123"
        returnUrl="https://example.com/checkout/return"
        onBack={vi.fn()}
        onPaymentSuccess={vi.fn()}
        error="Payment service unavailable."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/payment service unavailable/i);
  });
});
