/**
 * Purpose: Account notification preference controls for email and push channels.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/switch
 * Tests:
 *   - packages/storefront/src/components/settings/NotificationSettings.test.tsx
 */
import { useEffect, useState } from 'react';
import { Button, Card, Switch } from '@heroui/react';
import type { NotificationPreferences } from './settings-types';

export interface NotificationSettingsProps {
  readonly preferences: NotificationPreferences;
  readonly onSave: (preferences: NotificationPreferences) => Promise<void>;
}

const NOTIFICATION_FIELDS = [
  {
    key: 'emailSales',
    label: 'Email sales',
    description: 'Receive payout-ready sale summaries by email.',
  },
  {
    key: 'emailCollaborations',
    label: 'Email collaborations',
    description: 'Get collaborator invites and revenue split updates.',
  },
  {
    key: 'emailUpdates',
    label: 'Product updates',
    description: 'Hear about product announcements and platform changes.',
  },
  {
    key: 'pushSales',
    label: 'Push sales',
    description: 'Get browser push alerts for new sales.',
  },
  {
    key: 'pushCollaborations',
    label: 'Push collaborations',
    description: 'See collaborator activity without opening email.',
  },
] as const satisfies ReadonlyArray<{
  readonly key: keyof NotificationPreferences;
  readonly label: string;
  readonly description: string;
}>;

export function NotificationSettings({
  preferences,
  onSave,
}: NotificationSettingsProps) {
  const [draftPreferences, setDraftPreferences] =
    useState<NotificationPreferences>(preferences);
  const [submitError, setSubmitError] = useState<string>();

  useEffect(() => {
    setDraftPreferences(preferences);
  }, [preferences]);

  function setPreference(
    key: keyof NotificationPreferences,
    value: boolean,
  ) {
    setDraftPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSave() {
    setSubmitError(undefined);

    try {
      await onSave(draftPreferences);
    } catch (caughtError) {
      setSubmitError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to save notification settings.',
      );
    }
  }

  return (
    <Card>
      <Card.Header className="space-y-1">
        <Card.Title>Notification preferences</Card.Title>
        <Card.Description>
          Choose which account updates reach you by email or browser push.
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-4">
        {NOTIFICATION_FIELDS.map((field) => (
          <Switch
            key={field.key}
            aria-label={field.label}
            isSelected={draftPreferences[field.key]}
            onChange={(isSelected) => setPreference(field.key, isSelected)}
          >
            {({ isSelected }) => (
              <>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Content className="space-y-1">
                  <span className="font-medium">{field.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {field.description}
                    {isSelected ? ' Enabled.' : ' Disabled.'}
                  </span>
                </Switch.Content>
              </>
            )}
          </Switch>
        ))}

        {submitError ? (
          <p className="text-sm text-danger" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button onPress={handleSave}>Save notifications</Button>
        </div>
      </Card.Content>
    </Card>
  );
}
