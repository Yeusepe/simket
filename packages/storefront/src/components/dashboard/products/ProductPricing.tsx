/**
 * Purpose: Pricing controls for creator products, including formatted money inputs and take-rate messaging.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/input
 *   - https://www.heroui.com/docs/react/components/slider
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/ProductPricing.test.tsx
 */
import { Card, Input, Label, Slider } from '@heroui/react';
import type { ProductFormData, ProductFormErrors } from './product-types';
import { calculateCreatorEarnings, formatPrice } from './use-products';

interface ProductPricingProps {
  readonly data: Pick<ProductFormData, 'price' | 'compareAtPrice' | 'currency' | 'platformFeePercent'>;
  readonly errors?: Pick<ProductFormErrors, 'price' | 'compareAtPrice' | 'currency' | 'platformFeePercent'>;
  readonly onChange: (patch: Partial<ProductFormData>) => void;
}

function formatInputValue(value: number | undefined): string {
  if (typeof value !== 'number' || value <= 0) {
    return '';
  }

  return (value / 100).toFixed(2);
}

function parseCurrencyInput(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }

  const normalized = Number.parseFloat(value);
  if (Number.isNaN(normalized)) {
    return undefined;
  }

  return Math.round(normalized * 100);
}

export function ProductPricing({ data, errors, onChange }: ProductPricingProps) {
  const creatorEarnings = calculateCreatorEarnings(data.price, data.platformFeePercent);

  return (
    <Card variant="secondary">
      <Card.Header className="space-y-1">
        <Card.Title>Pricing</Card.Title>
        <Card.Description>Money stays in cents internally and is formatted for creators during editing.</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="product-price">Price</Label>
            <Input
              id="product-price"
              aria-label="Price"
              inputMode="decimal"
              placeholder="0.00"
              value={formatInputValue(data.price)}
              onChange={(event) => onChange({ price: parseCurrencyInput(event.currentTarget.value) ?? 0 })}
            />
            {errors?.price ? <p className="text-sm text-danger">{errors.price}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-compare-at-price">Compare-at price</Label>
            <Input
              id="product-compare-at-price"
              aria-label="Compare-at price"
              inputMode="decimal"
              placeholder="Optional"
              value={formatInputValue(data.compareAtPrice)}
              onChange={(event) =>
                onChange({ compareAtPrice: parseCurrencyInput(event.currentTarget.value) })
              }
            />
            {errors?.compareAtPrice ? (
              <p className="text-sm text-danger">{errors.compareAtPrice}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Use this to show the original list price during promotions.</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-currency">Currency</Label>
          <Input
            id="product-currency"
            aria-label="Currency"
            maxLength={3}
            value={data.currency}
            onChange={(event) => onChange({ currency: event.currentTarget.value.toUpperCase() })}
          />
          {errors?.currency ? <p className="text-sm text-danger">{errors.currency}</p> : null}
        </div>

        <div className="space-y-3">
          <Slider
            aria-label="Platform fee percentage"
            minValue={5}
            maxValue={30}
            step={1}
            value={data.platformFeePercent}
            onChange={(value) => {
              if (typeof value === 'number') {
                onChange({ platformFeePercent: value });
              }
            }}
          >
            <Label>Platform fee percentage</Label>
            <Slider.Output />
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
          {errors?.platformFeePercent ? (
            <p className="text-sm text-danger">{errors.platformFeePercent}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
          <p className="font-medium">You earn {formatPrice(creatorEarnings, data.currency)} per sale</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Higher platform fees increase recommendation visibility across the marketplace.
          </p>
        </div>
      </Card.Content>
    </Card>
  );
}
