/**
 * Purpose: Render the main account settings experience with HeroUI tab navigation across settings domains.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/tabs
 * Tests:
 *   - packages/storefront/src/components/settings/SettingsPage.test.tsx
 */
import { useState } from 'react';
import { Card, Tabs } from '@heroui/react';
import { ConnectedAccounts } from './ConnectedAccounts';
import { DangerZone } from './DangerZone';
import { NotificationSettings } from './NotificationSettings';
import { ProfileSettings } from './ProfileSettings';
import { SecuritySettings } from './SecuritySettings';
import type { SettingsTab } from './settings-types';
import { useSettings } from './use-settings';

const SETTINGS_TABS: readonly {
  readonly id: SettingsTab;
  readonly label: string;
}[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'connected', label: 'Connected Accounts' },
  { id: 'danger', label: 'Danger Zone' },
];

export function SettingsPage() {
  const settings = useSettings();
  const [selectedTab, setSelectedTab] = useState<SettingsTab>('profile');

  if (settings.isLoading) {
    return (
      <Card>
        <Card.Header>
          <Card.Title>Account settings</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-sm text-muted-foreground">Loading account settings…</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Account settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, security posture, notifications, linked providers, and destructive account actions.
        </p>
      </div>

      <Tabs
        selectedKey={selectedTab}
        variant="secondary"
        onSelectionChange={(key) => setSelectedTab(String(key) as SettingsTab)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Account settings sections">
            {SETTINGS_TABS.map((tab, index) => (
              <Tabs.Tab key={tab.id} id={tab.id}>
                {index > 0 ? <Tabs.Separator /> : null}
                <span>{tab.label}</span>
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="profile" className="pt-6">
          <ProfileSettings
            profile={settings.profile}
            onSave={settings.updateProfile}
          />
        </Tabs.Panel>
        <Tabs.Panel id="security" className="pt-6">
          <SecuritySettings
            accountName={settings.profile.displayName}
            security={settings.security}
            sessions={settings.sessions}
            onChangePassword={settings.changePassword}
            onToggleTwoFactor={settings.toggleTwoFactor}
            onRevokeSession={settings.revokeSession}
          />
        </Tabs.Panel>
        <Tabs.Panel id="notifications" className="pt-6">
          <NotificationSettings
            preferences={settings.notifications}
            onSave={(preferences) => settings.updateNotifications(preferences)}
          />
        </Tabs.Panel>
        <Tabs.Panel id="connected" className="pt-6">
          <ConnectedAccounts
            accounts={settings.connectedAccounts}
            availableProviders={settings.availableProviders}
            onConnect={(provider) =>
              settings.connectAccount(provider, settings.profile.email)
            }
            onDisconnect={settings.disconnectAccount}
          />
        </Tabs.Panel>
        <Tabs.Panel id="danger" className="pt-6">
          <DangerZone
            accountName={settings.profile.displayName}
            onExportData={settings.exportData}
            onDeleteAccount={(confirmationText) =>
              settings.deleteAccount({ confirmationText })
            }
          />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
