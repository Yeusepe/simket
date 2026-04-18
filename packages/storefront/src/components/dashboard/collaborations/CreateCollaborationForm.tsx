/**
 * Purpose: Form for creating new dashboard collaborations with validated 100% split totals.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §1.6 Convex functions)
 *   - docs/domain-model.md (§4.4 Collaboration)
 * External references:
 *   - https://heroui.com/docs/react/components/form.mdx
 *   - https://heroui.com/docs/react/components/select.mdx
 *   - https://heroui.com/docs/react/components/text-field.mdx
 *   - packages/storefront/node_modules/@heroui/react/dist/components/select/select.d.ts
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/CreateCollaborationForm.test.tsx
 */
import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from '@heroui/react';
import { useMemo, useState, type FormEvent } from 'react';
import type { CollaborationProductOption, CreateCollaborationInput } from './collab-types';
import { formatCurrency, getSplitTotal } from './collaboration-utils';

interface InviteeDraft {
  readonly id: string;
  readonly identifier: string;
  readonly splitPercent: number;
}

export interface CreateCollaborationFormProps {
  readonly availableProducts: readonly CollaborationProductOption[];
  readonly currentCreatorName: string;
  readonly initialProductId?: string;
  readonly initialOwnerSplitPercent?: number;
  readonly isSubmitting?: boolean;
  readonly onCancel?: () => void;
  readonly onSubmit: (input: CreateCollaborationInput) => Promise<void> | void;
}

interface ValidationErrors {
  productId?: string;
  ownerSplitPercent?: string;
  collaborators?: string;
}

function createInviteeDraft(index: number): InviteeDraft {
  return {
    id: `invitee-${index}`,
    identifier: '',
    splitPercent: 0,
  };
}

function isValidCollaboratorIdentifier(value: string): boolean {
  const normalized = value.trim();
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || /^@[a-z0-9._-]{3,}$/i.test(normalized)
  );
}

export function CreateCollaborationForm({
  availableProducts,
  currentCreatorName,
  initialProductId,
  initialOwnerSplitPercent = 60,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: CreateCollaborationFormProps) {
  const [productId, setProductId] = useState<string | string[] | null>(initialProductId ?? null);
  const [ownerSplitPercent, setOwnerSplitPercent] = useState(String(initialOwnerSplitPercent));
  const [invitees, setInvitees] = useState<readonly InviteeDraft[]>([createInviteeDraft(1)]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const totalConfiguredSplit = useMemo(
    () => getSplitTotal(Number(ownerSplitPercent) || 0, invitees),
    [invitees, ownerSplitPercent],
  );

  const selectedProduct = availableProducts.find((product) => product.id === productId);

  const updateInvitee = (id: string, nextInvitee: Partial<InviteeDraft>) => {
    setInvitees((current) =>
      current.map((invitee) => (invitee.id === id ? { ...invitee, ...nextInvitee } : invitee)),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const normalizedInvitees = invitees
      .map((invitee) => ({
        identifier: invitee.identifier.trim(),
        splitPercent: invitee.splitPercent,
      }))
      .filter((invitee) => invitee.identifier.length > 0 || invitee.splitPercent > 0);
    const parsedOwnerSplit = Number(ownerSplitPercent);

    const nextErrors: ValidationErrors = {};

    if (typeof productId !== 'string' || productId.length === 0) {
      nextErrors.productId = 'Choose a product for this collaboration.';
    }

    if (!Number.isFinite(parsedOwnerSplit) || parsedOwnerSplit < 0 || parsedOwnerSplit > 100) {
      nextErrors.ownerSplitPercent = 'Owner split must be between 0 and 100.';
    }

    if (normalizedInvitees.length === 0) {
      nextErrors.collaborators = 'Add at least one collaborator to continue.';
    } else if (
      normalizedInvitees.some(
        (invitee) =>
          !isValidCollaboratorIdentifier(invitee.identifier) ||
          invitee.splitPercent <= 0 ||
          invitee.splitPercent > 100,
      )
    ) {
      nextErrors.collaborators =
        'Each collaborator needs a valid email or @username and a split greater than 0%.';
    } else if (getSplitTotal(parsedOwnerSplit, normalizedInvitees) !== 100) {
      nextErrors.collaborators = 'Collaboration splits must add up to exactly 100%.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || typeof productId !== 'string') {
      return;
    }

    try {
      await onSubmit({
        productId,
        ownerSplitPercent: parsedOwnerSplit,
        collaborators: normalizedInvitees,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to create collaboration.');
    }
  };

  return (
    <Form aria-label="Create collaboration" className="space-y-6" onSubmit={handleSubmit}>
      <Select
        className="w-full"
        placeholder="Select a product"
        value={productId}
        onChange={(value) => {
          setProductId(value);
          setErrors((current) => ({ ...current, productId: undefined }));
        }}
      >
        <Label>Product</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {availableProducts.map((product) => (
              <ListBox.Item key={product.id} id={product.id} textValue={product.name}>
                <div className="flex flex-col">
                  <span>{product.name}</span>
                  <span className="text-xs text-default-500">
                    {formatCurrency(product.priceCents, product.currencyCode)} · {product.status}
                  </span>
                </div>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {errors.productId ? (
        <p className="text-sm text-danger" role="alert">
          {errors.productId}
        </p>
      ) : null}

      <TextField
        fullWidth
        isInvalid={Boolean(errors.ownerSplitPercent)}
        name="ownerSplitPercent"
        type="number"
        value={ownerSplitPercent}
        onChange={setOwnerSplitPercent}
      >
        <Label>{currentCreatorName} split percentage</Label>
        <Input min="0" max="100" />
        {selectedProduct ? (
          <Description>
            {selectedProduct.name} · owner retains this percentage of each sale.
          </Description>
        ) : (
          <Description>Set the creator share before adding collaborators.</Description>
        )}
        <FieldError>{errors.ownerSplitPercent ?? ''}</FieldError>
      </TextField>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Collaborators</p>
            <p className="text-sm text-muted-foreground">
              Invite by email address or marketplace @username.
            </p>
          </div>
          <Button
            variant="outline"
            onPress={() =>
              setInvitees((current) => [...current, createInviteeDraft(current.length + 1)])
            }
          >
            Add collaborator
          </Button>
        </div>

        {invitees.map((invitee, index) => (
          <div
            key={invitee.id}
            className="grid gap-3 rounded-2xl border border-default-200 p-4 md:grid-cols-[1fr_160px_auto]"
          >
            <TextField
              fullWidth
              name={`invitee-${index + 1}`}
              value={invitee.identifier}
              onChange={(value) => updateInvitee(invitee.id, { identifier: value })}
            >
              <Label>Collaborator email or username</Label>
              <Input placeholder="maya@example.com or @maya-light" />
            </TextField>

            <TextField
              fullWidth
              name={`split-${index + 1}`}
              type="number"
              value={invitee.splitPercent === 0 ? '' : String(invitee.splitPercent)}
              onChange={(value) =>
                updateInvitee(invitee.id, { splitPercent: value.length === 0 ? 0 : Number(value) })
              }
            >
              <Label>Split percentage</Label>
              <Input min="0" max="100" />
            </TextField>

            <div className="flex items-end">
              <Button
                variant="ghost"
                isDisabled={invitees.length === 1}
                onPress={() =>
                  setInvitees((current) => current.filter((currentInvitee) => currentInvitee.id !== invitee.id))
                }
              >
                Remove
              </Button>
            </div>
          </div>
        ))}

        {errors.collaborators ? (
          <p className="text-sm text-danger" role="alert">
            {errors.collaborators}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-default-200 bg-default-50 p-4">
        <p className="text-sm text-default-500">Configured split total</p>
        <p className="mt-2 text-2xl font-semibold">{totalConfiguredSplit}%</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Collaboration splits must equal exactly 100% before submission.
        </p>
      </div>

      {submitError ? (
        <p className="text-sm text-danger" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel ? (
          <Button variant="ghost" onPress={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button isPending={isSubmitting} type="submit">
          Create collaboration
        </Button>
      </div>
    </Form>
  );
}
