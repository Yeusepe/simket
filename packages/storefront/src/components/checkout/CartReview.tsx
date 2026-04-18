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
import { useCart } from '../../hooks/use-cart';

export interface CartReviewProps {
  readonly onProceed: () => void;
  readonly platformFeeRate?: number;
  readonly ownedProductIds?: readonly string[];
}

export function CartReview({
  onProceed,
  platformFeeRate = 0.05,
  ownedProductIds = [],
}: CartReviewProps) {
  const {
    cart,
    addPrerequisite,
    removeItem,
  } = useCart({ ownedProductIds });
  const { bundleGroups, dependencyValidation, standaloneItems, subtotal, currencyCode } = cart;
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

      {cart.items.length === 0 ? (
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
            {bundleGroups.map((bundle) => (
              <Card key={bundle.instanceId} variant="secondary">
                <Card.Header>
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Chip variant="soft" size="sm">
                          <Chip.Label>Bundle</Chip.Label>
                        </Chip>
                        <Card.Title>{bundle.name}</Card.Title>
                      </div>
                      <Card.Description>
                        Save {bundle.discountPercent}% across {bundle.items.length} items.
                      </Card.Description>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => removeItem(bundle.instanceId)}
                      aria-label={`Remove bundle ${bundle.name}`}
                    >
                      Remove
                    </Button>
                  </div>
                </Card.Header>
                <Card.Content className="space-y-3">
                  {bundle.items.map((item) => (
                    <div key={item.lineId} className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 rounded-lg">
                        {item.heroImageUrl ? <Avatar.Image src={item.heroImageUrl} alt={item.name} /> : null}
                        <Avatar.Fallback>{item.name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(item.effectivePrice, item.currencyCode)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-xl bg-content2 p-3">
                    <SummaryRow
                      label="Bundle subtotal"
                      value={formatPrice(bundle.bundleSubtotal, currencyCode)}
                    />
                    <SummaryRow
                      label="Bundle savings"
                      value={`-${formatPrice(bundle.bundleDiscountTotal, currencyCode)}`}
                    />
                    {bundle.dependencyDiscountTotal > 0 && (
                      <SummaryRow
                        label="Dependency savings"
                        value={`-${formatPrice(bundle.dependencyDiscountTotal, currencyCode)}`}
                      />
                    )}
                  </div>
                </Card.Content>
              </Card>
            ))}

            {standaloneItems.map((item) => (
              <Card key={item.lineId}>
                <Card.Content className="flex items-center gap-4 p-4">
                  <Avatar className="h-16 w-16 rounded-lg">
                    {item.heroImageUrl ? <Avatar.Image src={item.heroImageUrl} alt={item.name} /> : null}
                    <Avatar.Fallback>{item.name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Chip variant="soft">
                        <Chip.Label>{formatPrice(item.effectivePrice, item.currencyCode)}</Chip.Label>
                      </Chip>
                      <Chip variant="soft">
                        <Chip.Label>Qty {item.quantity}</Chip.Label>
                      </Chip>
                      {item.appliedDependencyDiscountPercent > 0 && (
                        <Chip variant="soft" size="sm">
                          <Chip.Label>Dependency -{item.appliedDependencyDiscountPercent}%</Chip.Label>
                        </Chip>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => removeItem(item.lineId)}
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
              {cart.discountTotal > 0 && (
                <SummaryRow
                  label="Discounts"
                  value={`-${formatPrice(cart.discountTotal, currencyCode)}`}
                />
              )}
              <SummaryRow
                label="Platform fee"
                value={formatPrice(platformFee, currencyCode)}
              />
              <SummaryRow
                label="Total"
                value={formatPrice(total, currencyCode)}
                emphasized
              />
              {dependencyValidation.issues.length > 0 && (
                <div className="space-y-3 rounded-xl border border-warning bg-warning/10 p-3">
                  <p className="font-medium text-warning">
                    Checkout is blocked until prerequisites are added.
                  </p>
                  {dependencyValidation.issues.map((issue) => (
                    <div key={issue.lineId} className="space-y-2 rounded-lg bg-background/70 p-3">
                      <p className="text-sm font-medium">{issue.message}</p>
                      {issue.missingRequirements.map((requirement) => (
                        <div
                          key={`${issue.lineId}-${requirement.requiredProductId}`}
                          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium">{requirement.requiredProductName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(requirement.requiredProductPrice, requirement.currencyCode)}
                              {requirement.discountPercent
                                ? ` · unlocks ${requirement.discountPercent}% off`
                                : ''}
                            </p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onPress={() => addPrerequisite(requirement)}
                          >
                            Add prerequisite
                          </Button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Card.Content>
            <Card.Footer>
              <Button
                variant="primary"
                className="w-full"
                isDisabled={cart.items.length === 0 || !dependencyValidation.canCheckout}
                onPress={onProceed}
              >
                Proceed to Payment
              </Button>
            </Card.Footer>
          </Card>
        </div>
      )}

      {cart.items.length === 0 ? (
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
