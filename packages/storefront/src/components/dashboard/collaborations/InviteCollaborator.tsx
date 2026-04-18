/**
 * Purpose: Collect collaborator email and proposed split percentage using HeroUI v3 compound form controls.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 Collaboration plugin)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/form
 *   - https://www.heroui.com/docs/react/components/text-field
 *   - https://www.heroui.com/docs/react/components/slider
 *   - packages/storefront/node_modules/@heroui/react/dist/components/textfield/textfield.d.ts
 *   - packages/storefront/node_modules/@heroui/react/dist/components/slider/slider.d.ts
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/InviteCollaborator.test.tsx
 */
import { Button, Card, FieldError, Form, Input, Label, Slider, TextField } from '@heroui/react';
import { useState, type FormEvent } from 'react';
import { useCollaborations } from './use-collaborations';
import type { UseCollaborationsHook } from './collab-types';

export interface InviteCollaboratorProps {
  readonly productId: string;
  readonly initialSplitPercent?: number;
  readonly useCollaborationsHook?: UseCollaborationsHook;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSliderValue(value: number | number[]): number {
  return typeof value === 'number' ? value : value[0] ?? 0;
}

export function InviteCollaborator({
  productId,
  initialSplitPercent = 25,
  useCollaborationsHook = useCollaborations,
}: InviteCollaboratorProps) {
  const { inviteCollaborator, isSubmitting, error } = useCollaborationsHook({ productId });
  const [email, setEmail] = useState('');
  const [splitPercent, setSplitPercent] = useState(initialSplitPercent);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [splitError, setSplitError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const nextEmailError = isValidEmail(normalizedEmail)
      ? null
      : 'Enter a valid collaborator email address.';
    const nextSplitError =
      splitPercent >= 1 && splitPercent <= 100
        ? null
        : 'Split percentage must be between 1 and 100.';

    setEmailError(nextEmailError);
    setSplitError(nextSplitError);

    if (nextEmailError || nextSplitError) {
      return;
    }

    await inviteCollaborator({
      productId,
      inviteeEmail: normalizedEmail,
      splitPercent,
    });
  };

  return (
    <Card>
      <Card.Header className="space-y-1">
        <Card.Title>Invite collaborator</Card.Title>
        <Card.Description>Propose a revenue split and send an invitation email link.</Card.Description>
      </Card.Header>
      <Card.Content>
        <Form data-testid="invite-collaborator-form" className="space-y-5" onSubmit={handleSubmit}>
          <TextField
            className="w-full"
            isInvalid={Boolean(emailError)}
            value={email}
            onChange={setEmail}
          >
            <Label>Collaborator email</Label>
            <Input type="email" name="inviteeEmail" placeholder="artist@example.com" fullWidth />
            <FieldError>{emailError ?? ''}</FieldError>
          </TextField>

          <div className="space-y-2">
            <Slider
              aria-label="Split percentage"
              value={splitPercent}
              minValue={0}
              maxValue={100}
              step={1}
              onChange={(value) => {
                setSplitPercent(getSliderValue(value));
                setSplitError(null);
              }}
            >
              <Label>Split percentage</Label>
              <Slider.Output />
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
            {splitError ? (
              <p className="text-sm text-danger" role="alert">
                {splitError}
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" isPending={isSubmitting}>
            Send invitation
          </Button>
        </Form>
      </Card.Content>
    </Card>
  );
}
