/**
 * Purpose: Checkout cart review step with transparent subtotal, platform fee,
 *   and total breakdown sourced from shared cart state.
 * Governing docs:
 *   - docs/architecture.md (§6.2 Purchase flow)
 *   - docs/domain-model.md (OrderLine pricing in minor units)
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/avatar
 *   - https://www.heroui.com/docs/react/components/chip
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/checkout/CartReview.test.tsx
 */
import { Avatar, Button, Card, Chip } from '@heroui/react';
import { formatPrice } from '../ProductCard';
import { useCartState } from '../../state/cart-state';

export interface CartReviewProps {
  readonly onProceed: () => void;
  readonly platformFeeRate?: number;
}

export function CartReview({
  onProceed,
  platformFeeRate = 0.05,
}: CartReviewProps) {
  const items = useCartState((state) => state.items);
  const subtotal = useCartState((state) => state.subtotal);
  const currencyCode = useCartState((state) => state.currencyCode);
  const removeItem = useCartState((state) => state.removeItem);
  const platformFee = Math.round(subtotal * platformFeeRate);
  const total = subtotal + platformFee;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Review your cart</h1>
        <p className="text-muted-foreground">
          Check your items and see exactly how the platform fee contributes to the
          final total.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <Card.Content className="py-12 text-center">
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add a product to continue to payment.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.variantId}>
                <Card.Content className="flex items-center gap-4 p-4">
                  <Avatar className="h-16 w-16 rounded-lg">
                    {item.heroImageUrl ? <Avatar.Image src={item.heroImageUrl} alt={item.name} /> : null}
                    <Avatar.Fallback>{item.name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Chip variant="soft">
                        <Chip.Label>{formatPrice(item.price, item.currencyCode)}</Chip.Label>
                      </Chip>
                      <Chip variant="soft">
                        <Chip.Label>Qty {item.quantity}</Chip.Label>
                      </Chip>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => removeItem(item.variantId)}
                    aria-label={`Remove ${item.name}`}
                  >
                    Remove
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </div>

          <Card>
            <Card.Header>
              <Card.Title>Order total</Card.Title>
              <Card.Description>Transparent pricing before payment</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-3">
              <SummaryRow
                label="Subtotal"
                value={formatPrice(subtotal, currencyCode)}
              />
              <SummaryRow
                label="Platform fee"
                value={formatPrice(platformFee, currencyCode)}
              />
              <SummaryRow
                label="Total"
                value={formatPrice(total, currencyCode)}
                emphasized
              />
            </Card.Content>
            <Card.Footer>
              <Button
                variant="primary"
                className="w-full"
                isDisabled={items.length === 0}
                onPress={onProceed}
              >
                Proceed to Payment
              </Button>
            </Card.Footer>
          </Card>
        </div>
      )}

      {items.length === 0 ? (
        <div className="max-w-sm self-end">
          <Button
            variant="primary"
            className="w-full"
            isDisabled
          >
            Proceed to Payment
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasized = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={emphasized ? 'font-semibold' : 'text-muted-foreground'}>
        {label}
      </span>
      <span className={emphasized ? 'text-lg font-semibold' : 'font-medium'}>
        {value}
      </span>
    </div>
  );
}
