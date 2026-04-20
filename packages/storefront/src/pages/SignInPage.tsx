/**
 * Purpose: Render the storefront sign-in and sign-up experience for buyers and
 *          creator OAuth federation.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://heroui.com/docs/react/components/button
 *   - https://heroui.com/docs/react/components/card
 *   - https://heroui.com/docs/react/components/text-field
 * Tests:
 *   - packages/storefront/src/components/settings/use-settings.test.ts
 */
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, FieldError, Input, Label, TextField } from '@heroui/react';
import { useAuth } from '../auth/AuthProvider';

type Mode = 'sign-in' | 'sign-up';

function getRedirectTarget(location: ReturnType<typeof useLocation>): string {
  const locationState = location.state as { readonly from?: string } | null;
  return locationState?.from ?? '/profile';
}

export function SignInPage() {
  const { signInBuyer, signInCreator, signUpBuyer, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = useMemo(() => getRedirectTarget(location), [location]);
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleBuyerSubmit() {
    setFormError(null);
    setIsPending(true);

    try {
      if (mode === 'sign-in') {
        await signInBuyer(email, password);
      } else {
        await signUpBuyer(name, email, password);
      }

      navigate(redirectTarget, { replace: true });
    } catch (submissionError) {
      setFormError(
        submissionError instanceof Error ? submissionError.message : 'Authentication failed.',
      );
    } finally {
      setIsPending(false);
    }
  }

  async function handleCreatorSignIn() {
    setFormError(null);
    setIsPending(true);
    try {
      await signInCreator();
    } catch (submissionError) {
      setFormError(
        submissionError instanceof Error ? submissionError.message : 'Creator sign-in failed.',
      );
      setIsPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center px-4 py-12">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card variant="secondary" className="gap-5 p-6 sm:p-8">
          <Card.Header className="space-y-2">
            <Card.Title className="text-3xl">Welcome to Simket</Card.Title>
            <Card.Description>
              Sign in with your Simket account for buyer flows, or use your YUCP creator account to
              open the creator dashboard.
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant={mode === 'sign-in' ? 'primary' : 'secondary'}
                onPress={() => setMode('sign-in')}
              >
                Sign in
              </Button>
              <Button
                variant={mode === 'sign-up' ? 'primary' : 'secondary'}
                onPress={() => setMode('sign-up')}
              >
                Create account
              </Button>
            </div>

            {mode === 'sign-up' ? (
              <TextField name="name" onChange={setName} value={name}>
                <Label>Name</Label>
                <Input placeholder="Simket Buyer" />
              </TextField>
            ) : null}

            <TextField name="email" type="email" onChange={setEmail} value={email}>
              <Label>Email</Label>
              <Input placeholder="buyer@simket.test" />
            </TextField>

            <TextField name="password" type="password" onChange={setPassword} value={password}>
              <Label>Password</Label>
              <Input placeholder="Enter your password" />
            </TextField>

            {formError || error ? <FieldError>{formError ?? error}</FieldError> : null}

            <Button fullWidth isPending={isPending} onPress={() => void handleBuyerSubmit()}>
              {mode === 'sign-in' ? 'Continue with Simket' : 'Create Simket account'}
            </Button>
          </Card.Content>
        </Card>

        <Card className="gap-5 p-6 sm:p-8">
          <Card.Header className="space-y-2">
            <Card.Title className="text-2xl">Creator sign-in</Card.Title>
            <Card.Description>
              Creator identity is federated through YUCP. Use your creator account there and Simket
              will sync the local customer and dashboard ownership automatically.
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
            <Button fullWidth variant="secondary" isPending={isPending} onPress={() => void handleCreatorSignIn()}>
              Continue with YUCP
            </Button>
            <div className="rounded-2xl border border-border/70 bg-surface-secondary p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Local development accounts</p>
              <p className="mt-2">Buyer: <span className="font-mono">buyer@simket.test</span> / <span className="font-mono">SimketBuyer123</span></p>
              <p className="mt-1">Creator: <span className="font-mono">alex.creator@simket.test</span> / <span className="font-mono">SimketCreator123</span></p>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
