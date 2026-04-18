/**
 * Purpose: Creator-facing license policy editor for scheme settings, limits, duration, and attached products.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/form
 *   - https://www.heroui.com/docs/react/components/checkbox-group
 * Tests:
 *   - packages/storefront/src/components/dashboard/licenses/LicensePolicyForm.test.tsx
 */
import { useMemo, useState } from 'react';
import { Button, Checkbox, CheckboxGroup, Form, Input, Label, TextArea } from '@heroui/react';
import type {
  LicensePolicyFormData,
  LicensePolicyFormErrors,
  LicenseProductOption,
  LicenseScheme,
} from './license-types';
import { validateLicensePolicyForm } from './use-licenses';

interface LicensePolicyFormProps {
  readonly initialData?: Partial<LicensePolicyFormData>;
  readonly availableProducts: readonly LicenseProductOption[];
  readonly isSubmitting?: boolean;
  readonly onSubmit: (data: LicensePolicyFormData) => Promise<void> | void;
  readonly onCancel?: () => void;
}

interface FormState {
  readonly name: string;
  readonly description: string;
  readonly scheme: LicenseScheme;
  readonly maxMachines: string;
  readonly maxUses: string;
  readonly durationDays: string;
  readonly attachedProductIds: readonly string[];
}

function buildInitialState(initialData?: Partial<LicensePolicyFormData>): FormState {
  return {
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    scheme: initialData?.scheme ?? 'per-seat',
    maxMachines: String(initialData?.maxMachines ?? 1),
    maxUses: String(initialData?.maxUses ?? 0),
    durationDays:
      initialData?.durationDays === null || initialData?.durationDays === undefined
        ? ''
        : String(initialData.durationDays),
    attachedProductIds: initialData?.attachedProductIds ?? [],
  };
}

function normalizeFormState(state: FormState): LicensePolicyFormData {
  return {
    name: state.name.trim(),
    description: state.description.trim(),
    scheme: state.scheme,
    maxMachines: Number(state.maxMachines),
    maxUses: Number(state.maxUses),
    durationDays: state.durationDays.trim().length === 0 ? null : Number(state.durationDays),
    attachedProductIds: [...state.attachedProductIds],
  };
}

const SCHEME_OPTIONS: ReadonlyArray<{ readonly value: LicenseScheme; readonly label: string }> = [
  { value: 'per-seat', label: 'Per seat' },
  { value: 'per-machine', label: 'Per machine' },
  { value: 'floating', label: 'Floating' },
];

export function LicensePolicyForm({
  initialData,
  availableProducts,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: LicensePolicyFormProps) {
  const [formState, setFormState] = useState<FormState>(() => buildInitialState(initialData));
  const [errors, setErrors] = useState<LicensePolicyFormErrors>({});

  const submitLabel = useMemo(() => (initialData ? 'Save changes' : 'Save policy'), [initialData]);

  const patchState = (patch: Partial<FormState>) => {
    setFormState((current) => ({ ...current, ...patch }));
  };

  const submitForm = async () => {
    const payload = normalizeFormState(formState);
    const nextErrors = validateLicensePolicyForm(payload);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit(payload);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitForm();
  };

  return (
    <Form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-2">
        <Label htmlFor="license-policy-name">Policy name</Label>
        <Input
          id="license-policy-name"
          aria-label="Policy name"
          value={formState.name}
          onChange={(event) => patchState({ name: event.currentTarget.value })}
        />
        {errors.name ? <p className="text-sm text-danger">{errors.name}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="license-policy-description">Description</Label>
        <TextArea
          id="license-policy-description"
          aria-label="Description"
          value={formState.description}
          onChange={(event) => patchState({ description: event.currentTarget.value })}
        />
      </div>

      <div className="space-y-3">
        <Label>License scheme</Label>
        <div className="flex flex-wrap gap-2">
          {SCHEME_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={formState.scheme === option.value ? 'secondary' : 'ghost'}
              aria-pressed={formState.scheme === option.value}
              onPress={() => patchState({ scheme: option.value })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="license-policy-max-machines">Max machines</Label>
          <Input
            id="license-policy-max-machines"
            aria-label="Max machines"
            type="number"
            min={1}
            value={formState.maxMachines}
            onChange={(event) => patchState({ maxMachines: event.currentTarget.value })}
          />
          {errors.maxMachines ? <p className="text-sm text-danger">{errors.maxMachines}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="license-policy-max-uses">Max uses</Label>
          <Input
            id="license-policy-max-uses"
            aria-label="Max uses"
            type="number"
            min={0}
            value={formState.maxUses}
            onChange={(event) => patchState({ maxUses: event.currentTarget.value })}
          />
          {errors.maxUses ? <p className="text-sm text-danger">{errors.maxUses}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="license-policy-duration-days">Expiration duration (days)</Label>
          <Input
            id="license-policy-duration-days"
            aria-label="Expiration duration (days)"
            type="number"
            min={0}
            value={formState.durationDays}
            onChange={(event) => patchState({ durationDays: event.currentTarget.value })}
          />
          {errors.durationDays ? <p className="text-sm text-danger">{errors.durationDays}</p> : null}
        </div>
      </div>

      <CheckboxGroup
        name="attached-products"
        value={[...formState.attachedProductIds]}
        onChange={(value) => patchState({ attachedProductIds: value })}
      >
        <Label>Attach to products</Label>
        {availableProducts.map((product) => (
          <Checkbox key={product.id} value={product.id}>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content>
              <Label>{product.name}</Label>
            </Checkbox.Content>
          </Checkbox>
        ))}
      </CheckboxGroup>
      {errors.attachedProductIds ? <p className="text-sm text-danger">{errors.attachedProductIds}</p> : null}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onPress={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="button" isPending={isSubmitting} isDisabled={isSubmitting} onPress={() => void submitForm()}>
          {submitLabel}
        </Button>
      </div>
    </Form>
  );
}
