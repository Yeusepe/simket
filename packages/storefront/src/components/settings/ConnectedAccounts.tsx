/**
 * Purpose: Manage OAuth account connections used for Better Auth sign-in providers.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.better-auth.com/docs
 * Tests:
 *   - packages/storefront/src/components/settings/SettingsPage.test.tsx
 */
import { Button, Card } from '@heroui/react';
import type { ConnectedAccount } from './settings-types';

export interface ConnectedAccountsProps {
  readonly accounts: readonly ConnectedAccount[];
  readonly availableProviders: readonly string[];
  readonly onConnect: (provider: string) => Promise<void>;
  readonly onDisconnect: (provider: string) => Promise<void>;
}

function formatProviderName(provider: string): string {
  return provider.slice(0, 1).toUpperCase() + provider.slice(1);
}

export function ConnectedAccounts({
  accounts,
  availableProviders,
  onConnect,
  onDisconnect,
}: ConnectedAccountsProps) {
  return (
    <Card>
      <Card.Header className="space-y-1">
        <Card.Title>Connected accounts</Card.Title>
        <Card.Description>
          Review OAuth providers linked to your Better Auth identity and add backup sign-in options.
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Active connections</h3>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No external accounts are connected.
            </p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((account) => (
                <li
                  key={account.provider}
                  className="flex flex-col gap-3 rounded-lg border border-divider p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{formatProviderName(account.provider)}</p>
                    <p className="text-sm text-muted-foreground">{account.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Connected {new Date(account.connectedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onPress={() => onDisconnect(account.provider)}
                  >
                    Disconnect {formatProviderName(account.provider)}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Available providers</h3>
          {availableProviders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All supported providers are already connected.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {availableProviders.map((provider) => (
                <Button
                  key={provider}
                  variant="ghost"
                  onPress={() => onConnect(provider)}
                >
                  Connect {formatProviderName(provider)}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}
