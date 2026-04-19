/**
 * Purpose: Final checkout success step showing the completed order summary.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/domain-model.md (Order, OrderLine)
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 *   - https://www.heroui.com/docs/react/components/chip
 * Tests:
 *   - packages/storefront/src/components/checkout/OrderConfirmation.test.tsx
 */
import { Button, Card, Chip } from '@heroui/react';
import { formatPrice } from '../ProductCard';
import type { OrderSummary } from './checkout-types';
import { Icon } from '../common/Icon';

export interface OrderConfirmationProps {
  readonly orderSummary: OrderSummary;
  readonly onContinueShopping: () => void;
  readonly onGoToLibrary: () => void;
}

export function OrderConfirmation({
  orderSummary,
  onContinueShopping,
  onGoToLibrary,
}: OrderConfirmationProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Card>
        <Card.Header className="flex flex-col items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <Icon name="check" size={32} />
          </div>
          <div>
            <Card.Title>Thanks for your purchase</Card.Title>
            <Card.Description>
              Order {orderSummary.orderId} was placed successfully.
            </Card.Description>
          </div>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="grid gap-3 rounded-xl border border-divider p-4 sm:grid-cols-3">
            <SummaryStat label="Subtotal" value={formatPrice(orderSummary.subtotal, orderSummary.currency)} />
            <SummaryStat label="Platform fee" value={formatPrice(orderSummary.platformFee, orderSummary.currency)} />
            <SummaryStat label="Total paid" value={formatPrice(orderSummary.total, orderSummary.currency)} />
          </div>

          <div className="space-y-3">
            {orderSummary.items.map((item) => (
              <Card key={item.variantId}>
                <Card.Content className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantity {item.quantity}
                    </p>
                  </div>
                  <Chip variant="soft">
                    <Chip.Label>
                      {formatPrice(item.price * item.quantity, orderSummary.currency)}
                    </Chip.Label>
                  </Chip>
                </Card.Content>
              </Card>
            ))}
          </div>
        </Card.Content>
        <Card.Footer className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" className="w-full sm:flex-1" onPress={onContinueShopping}>
            Continue Shopping
          </Button>
          <Button variant="primary" className="w-full sm:flex-1" onPress={onGoToLibrary}>
            Go to Library
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
