/**
 * Purpose: Capture creator experiment drafts including product scope, weighted variants, and audience rules.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/form
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/input
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/experiments/ExperimentForm.test.tsx
 */
import { useState } from 'react';
import { Button, Card, Form, Input, Label } from '@heroui/react';
import type { CreateExperimentInput, ExperimentVariantDefinition } from './experiment-types';

interface VariantDraft {
  readonly name: string;
  readonly weight: string;
  readonly ctaText: string;
  readonly description: string;
  readonly priceDisplay: string;
}

const EMPTY_VARIANT: VariantDraft = {
  name: '',
  weight: '100',
  ctaText: '',
  description: '',
  priceDisplay: '',
};

function toVariantDefinition(variant: VariantDraft): ExperimentVariantDefinition {
  return {
    name: variant.name.trim(),
    weight: Number.parseInt(variant.weight, 10) || 0,
    config: {
      ...(variant.ctaText.trim() ? { ctaText: variant.ctaText.trim() } : {}),
      ...(variant.description.trim() ? { description: variant.description.trim() } : {}),
      ...(variant.priceDisplay.trim() ? { priceDisplay: variant.priceDisplay.trim() } : {}),
    },
  };
}

export interface ExperimentFormProps {
  readonly products?: readonly { id: string; name: string }[];
  readonly onSubmit: (input: CreateExperimentInput) => void | Promise<void>;
  readonly submitLabel?: string;
}

export function ExperimentForm({
  products = [],
  onSubmit,
  submitLabel = 'Create experiment',
}: ExperimentFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productId, setProductId] = useState('');
  const [regionList, setRegionList] = useState('');
  const [variants, setVariants] = useState<VariantDraft[]>([
    { ...EMPTY_VARIANT, weight: '50' },
  ]);

  const patchVariant = (index: number, patch: Partial<VariantDraft>) => {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant,
      ),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      productId: productId.trim() || undefined,
      audienceRules: regionList.trim()
        ? {
            mode: 'segment',
            regions: regionList
              .split(',')
              .map((value) => value.trim().toLowerCase())
              .filter(Boolean),
          }
        : { mode: 'all-users' },
      variants: variants.map(toVariantDefinition),
    });
  };

  return (
    <Card>
      <Card.Header className="space-y-1">
        <Card.Title>Create experiment</Card.Title>
        <Card.Description>
          Launch audience-segmented tests for product pages, pricing, and copy.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="experiment-name">Experiment name</Label>
            <Input
              id="experiment-name"
              aria-label="Experiment name"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experiment-description">Experiment description</Label>
            <Input
              id="experiment-description"
              aria-label="Experiment description"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experiment-product">Product selector</Label>
            <Input
              id="experiment-product"
              aria-label="Product selector"
              list="experiment-products"
              placeholder="Optional product scope"
              value={productId}
              onChange={(event) => setProductId(event.currentTarget.value)}
            />
            <datalist id="experiment-products">
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experiment-regions">Audience regions</Label>
            <Input
              id="experiment-regions"
              aria-label="Audience regions"
              placeholder="Optional comma separated regions (e.g. eu, us)"
              value={regionList}
              onChange={(event) => setRegionList(event.currentTarget.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Variants</h3>
              <Button
                variant="secondary"
                onPress={() => setVariants((current) => [...current, { ...EMPTY_VARIANT, weight: '50' }])}
              >
                Add variant
              </Button>
            </div>

            {variants.map((variant, index) => (
              <Card key={`variant-${index}`} variant="secondary">
                <Card.Content className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`experiment-variant-name-${index}`}>
                      Variant {index + 1} name
                    </Label>
                    <Input
                      id={`experiment-variant-name-${index}`}
                      aria-label={`Variant ${index + 1} name`}
                      value={variant.name}
                      onChange={(event) =>
                        patchVariant(index, { name: event.currentTarget.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`experiment-variant-weight-${index}`}>
                      Variant {index + 1} weight
                    </Label>
                    <Input
                      id={`experiment-variant-weight-${index}`}
                      aria-label={`Variant ${index + 1} weight`}
                      inputMode="numeric"
                      value={variant.weight}
                      onChange={(event) =>
                        patchVariant(index, { weight: event.currentTarget.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`experiment-variant-cta-${index}`}>
                      Variant {index + 1} CTA text
                    </Label>
                    <Input
                      id={`experiment-variant-cta-${index}`}
                      aria-label={`Variant ${index + 1} CTA text`}
                      value={variant.ctaText}
                      onChange={(event) =>
                        patchVariant(index, { ctaText: event.currentTarget.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`experiment-variant-price-${index}`}>
                      Variant {index + 1} price display
                    </Label>
                    <Input
                      id={`experiment-variant-price-${index}`}
                      aria-label={`Variant ${index + 1} price display`}
                      value={variant.priceDisplay}
                      onChange={(event) =>
                        patchVariant(index, { priceDisplay: event.currentTarget.value })
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`experiment-variant-description-${index}`}>
                      Variant {index + 1} description
                    </Label>
                    <Input
                      id={`experiment-variant-description-${index}`}
                      aria-label={`Variant ${index + 1} description`}
                      value={variant.description}
                      onChange={(event) =>
                        patchVariant(index, { description: event.currentTarget.value })
                      }
                    />
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="submit">{submitLabel}</Button>
          </div>
        </Form>
      </Card.Content>
    </Card>
  );
}
