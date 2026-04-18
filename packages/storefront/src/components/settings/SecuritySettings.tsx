/**
 * Purpose: Account security management for password rotation, 2FA preferences, and session revocation.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/input
 *   - https://www.heroui.com/docs/react/components/switch
 * Tests:
 *   - packages/storefront/src/components/settings/SecuritySettings.test.tsx
 */
import { useState } from 'react';
import { Button, Card, Input, Switch } from '@heroui/react';
import { validatePassword } from './use-settings';
import type {
  ChangePasswordInput,
  SecurityInfo,
  SecuritySession,
} from './settings-types';

export interface SecuritySettingsProps {
  readonly accountName: string;
  readonly security: SecurityInfo;
  readonly sessions: readonly SecuritySession[];
  readonly onChangePassword: (input: ChangePasswordInput) => Promise<void>;
  readonly onToggleTwoFactor: (isEnabled: boolean) => Promise<void>;
  readonly onRevokeSession: (sessionId: string) => Promise<void>;
}

type PasswordFormState = ChangePasswordInput;

export function SecuritySettings({
  accountName,
  security,
  sessions,
  onChangePassword,
  onToggleTwoFactor,
  onRevokeSession,
}: SecuritySettingsProps) {
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string>();

  function setPasswordField<Key extends keyof PasswordFormState>(
    key: Key,
    value: PasswordFormState[Key],
  ) {
    setPasswordForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordForm.currentPassword.trim().length === 0) {
      setPasswordError('Current password is required.');
      return;
    }

    const nextPasswordError = validatePassword(passwordForm.newPassword);
    if (nextPasswordError) {
      setPasswordError(nextPasswordError);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation must match.');
      return;
    }

    setPasswordError(undefined);

    try {
      await onChangePassword(passwordForm);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (caughtError) {
      setPasswordError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to update your password.',
      );
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <Card.Header className="space-y-1">
          <Card.Title>Change password</Card.Title>
          <Card.Description>
            Rotate your Better Auth password without exposing the current secret anywhere in the UI.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium" htmlFor="settings-current-password">
                Current password
              </label>
              <Input
                id="settings-current-password"
                aria-label="Current password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordField('currentPassword', event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="settings-new-password">
                New password
              </label>
              <Input
                id="settings-new-password"
                aria-label="New password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordField('newPassword', event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="settings-confirm-password">
                Confirm new password
              </label>
              <Input
                id="settings-confirm-password"
                aria-label="Confirm new password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordField('confirmPassword', event.target.value)
                }
              />
            </div>
            {passwordError ? (
              <p className="text-sm text-danger md:col-span-2" role="alert">
                {passwordError}
              </p>
            ) : null}
            <div className="flex justify-end md:col-span-2">
              <Button type="submit">Update password</Button>
            </div>
          </form>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header className="space-y-1">
          <Card.Title>Security controls</Card.Title>
          <Card.Description>
            Review second-factor protection and active sessions for {accountName}.
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-6">
          <Switch
            aria-label="Two-factor authentication"
            isSelected={security.hasTwoFactor}
            onChange={onToggleTwoFactor}
          >
            {({ isSelected }) => (
              <>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Content className="space-y-1">
                  <span className="font-medium">Two-factor authentication</span>
                  <span className="text-sm text-muted-foreground">
                    {isSelected
                      ? 'Two-factor authentication is enabled.'
                      : 'Require a second factor during sign-in.'}
                  </span>
                </Switch.Content>
              </>
            )}
          </Switch>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Active sessions</h3>
              <p className="text-sm text-muted-foreground">
                {security.activeSessions} active session{security.activeSessions === 1 ? '' : 's'}.
              </p>
            </div>
            <ul className="space-y-3">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-col gap-3 rounded-lg border border-divider p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {session.label}
                      {session.isCurrent ? ' (Current)' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last active: {new Date(session.lastActiveAt).toLocaleString()}
                    </p>
                  </div>
                  {session.isCurrent ? (
                    <span className="text-sm text-muted-foreground">
                      This session cannot be revoked here.
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      onPress={() => onRevokeSession(session.id)}
                    >
                      Revoke {session.label}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
