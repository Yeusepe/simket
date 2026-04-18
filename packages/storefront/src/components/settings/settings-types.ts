/**
 * Purpose: Shared account settings models for storefront settings components and hooks.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://www.better-auth.com/docs
 * Tests:
 *   - packages/storefront/src/components/settings/use-settings.test.ts
 *   - packages/storefront/src/components/settings/SettingsPage.test.tsx
 */
export type SettingsTab =
  | 'profile'
  | 'security'
  | 'notifications'
  | 'connected'
  | 'danger';

export interface UserProfile {
  readonly displayName: string;
  readonly email: string;
  readonly avatarUrl?: string;
  readonly bio?: string;
  readonly website?: string;
  readonly createdAt: string;
}

export interface NotificationPreferences {
  readonly emailSales: boolean;
  readonly emailCollaborations: boolean;
  readonly emailUpdates: boolean;
  readonly pushSales: boolean;
  readonly pushCollaborations: boolean;
}

export interface ConnectedAccount {
  readonly provider: string;
  readonly email: string;
  readonly connectedAt: string;
}

export interface SecurityInfo {
  readonly hasTwoFactor: boolean;
  readonly activeSessions: number;
  readonly lastPasswordChange?: string;
}

export interface SecuritySession {
  readonly id: string;
  readonly label: string;
  readonly lastActiveAt: string;
  readonly isCurrent: boolean;
}

export interface ProfileUpdateInput {
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly bio?: string;
  readonly website?: string;
}

export interface ChangePasswordInput {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
}

export interface DeleteAccountInput {
  readonly confirmationText: string;
}

export interface UseSettingsResult {
  readonly profile: UserProfile;
  readonly security: SecurityInfo;
  readonly sessions: readonly SecuritySession[];
  readonly notifications: NotificationPreferences;
  readonly connectedAccounts: readonly ConnectedAccount[];
  readonly availableProviders: readonly string[];
  readonly isLoading: boolean;
  readonly updateProfile: (profile: ProfileUpdateInput) => Promise<void>;
  readonly changePassword: (input: ChangePasswordInput) => Promise<void>;
  readonly toggleTwoFactor: (isEnabled: boolean) => Promise<void>;
  readonly revokeSession: (sessionId: string) => Promise<void>;
  readonly updateNotifications: (
    nextPreferences: Partial<NotificationPreferences>,
  ) => Promise<void>;
  readonly connectAccount: (provider: string, email: string) => Promise<void>;
  readonly disconnectAccount: (provider: string) => Promise<void>;
  readonly exportData: () => Promise<string>;
  readonly deleteAccount: (input: DeleteAccountInput) => Promise<void>;
}
