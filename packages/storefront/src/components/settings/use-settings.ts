/**
 * Purpose: Manage account settings state, validation, and user-initiated CRUD actions for the storefront.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://react.dev/reference/react/useCallback
 *   - https://react.dev/reference/react/useEffect
 *   - https://react.dev/reference/react/useMemo
 *   - https://www.better-auth.com/docs
 * Tests:
 *   - packages/storefront/src/components/settings/use-settings.test.ts
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ChangePasswordInput,
  ConnectedAccount,
  DeleteAccountInput,
  NotificationPreferences,
  ProfileUpdateInput,
  SecurityInfo,
  SecuritySession,
  UseSettingsResult,
  UserProfile,
} from './settings-types';

const SUPPORTED_PROVIDERS = ['github', 'google', 'discord'] as const;

type SettingsSnapshot = {
  readonly profile: UserProfile;
  readonly security: SecurityInfo;
  readonly sessions: readonly SecuritySession[];
  readonly notifications: NotificationPreferences;
  readonly connectedAccounts: readonly ConnectedAccount[];
};

function createInitialSettingsSnapshot(): SettingsSnapshot {
  return {
    profile: {
      displayName: 'Simket Creator',
      email: 'creator@simket.test',
      bio: 'Making storefront-ready digital goods.',
      website: 'https://simket.dev',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    security: {
      hasTwoFactor: false,
      activeSessions: 2,
      lastPasswordChange: '2025-02-01T00:00:00.000Z',
    },
    sessions: [
      {
        id: 'session-current',
        label: 'Current browser',
        lastActiveAt: '2025-03-10T12:00:00.000Z',
        isCurrent: true,
      },
      {
        id: 'session-mobile',
        label: 'iPhone 15 Pro',
        lastActiveAt: '2025-03-10T09:15:00.000Z',
        isCurrent: false,
      },
    ],
    notifications: {
      emailSales: true,
      emailCollaborations: true,
      emailUpdates: true,
      pushSales: false,
      pushCollaborations: false,
    },
    connectedAccounts: [
      {
        provider: 'github',
        email: 'creator@example.com',
        connectedAt: '2025-01-10T09:00:00.000Z',
      },
    ],
  };
}

function normalizeProvider(provider: string): string {
  return provider.trim().toLowerCase();
}

function nowIsoString(): string {
  return new Date().toISOString();
}

export function validateDisplayName(name: string): string | undefined {
  const normalizedName = name.trim();

  if (normalizedName.length < 2) {
    return 'Display name must be at least 2 characters long.';
  }

  if (normalizedName.length > 50) {
    return 'Display name must be 50 characters or fewer.';
  }

  return undefined;
}

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

export function validatePassword(password: string): string | undefined {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter.';
  }

  if (!/\d/.test(password)) {
    return 'Password must include a number.';
  }

  return undefined;
}

export function validateWebsiteUrl(url: string): string | undefined {
  const normalizedUrl = url.trim();

  if (normalizedUrl.length === 0) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return 'Website must be a valid HTTP or HTTPS URL.';
    }
  } catch {
    return 'Website must be a valid HTTP or HTTPS URL.';
  }

  return undefined;
}

export function useSettings(): UseSettingsResult {
  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    email: '',
    createdAt: '',
  });
  const [security, setSecurity] = useState<SecurityInfo>({
    hasTwoFactor: false,
    activeSessions: 0,
  });
  const [sessions, setSessions] = useState<readonly SecuritySession[]>([]);
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailSales: false,
    emailCollaborations: false,
    emailUpdates: false,
    pushSales: false,
    pushCollaborations: false,
  });
  const [connectedAccounts, setConnectedAccounts] = useState<
    readonly ConnectedAccount[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void Promise.resolve(createInitialSettingsSnapshot()).then((snapshot) => {
      if (!isMounted) {
        return;
      }

      setProfile(snapshot.profile);
      setSecurity(snapshot.security);
      setSessions(snapshot.sessions);
      setNotifications(snapshot.notifications);
      setConnectedAccounts(snapshot.connectedAccounts);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateProfile = useCallback(async (nextProfile: ProfileUpdateInput) => {
    const displayNameError = validateDisplayName(nextProfile.displayName);
    if (displayNameError) {
      throw new Error(displayNameError);
    }

    const websiteError = validateWebsiteUrl(nextProfile.website ?? '');
    if (websiteError) {
      throw new Error(websiteError);
    }

    await Promise.resolve();

    setProfile((current) => ({
      ...current,
      displayName: nextProfile.displayName.trim(),
      avatarUrl: nextProfile.avatarUrl,
      bio: nextProfile.bio?.trim() || undefined,
      website: nextProfile.website?.trim() || undefined,
    }));
  }, []);

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    if (input.currentPassword.trim().length === 0) {
      throw new Error('Current password is required.');
    }

    const passwordError = validatePassword(input.newPassword);
    if (passwordError) {
      throw new Error(passwordError);
    }

    if (input.newPassword !== input.confirmPassword) {
      throw new Error('New password and confirmation must match.');
    }

    await Promise.resolve();

    setSecurity((current) => ({
      ...current,
      lastPasswordChange: nowIsoString(),
    }));
  }, []);

  const toggleTwoFactor = useCallback(async (isEnabled: boolean) => {
    await Promise.resolve();

    setSecurity((current) => ({
      ...current,
      hasTwoFactor: isEnabled,
    }));
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    await Promise.resolve();

    setSessions((currentSessions) => {
      const nextSessions = currentSessions.filter((session) => session.id !== sessionId);
      setSecurity((currentSecurity) => ({
        ...currentSecurity,
        activeSessions: nextSessions.length,
      }));
      return nextSessions;
    });
  }, []);

  const updateNotifications = useCallback(
    async (nextPreferences: Partial<NotificationPreferences>) => {
      await Promise.resolve();

      setNotifications((current) => ({
        ...current,
        ...nextPreferences,
      }));
    },
    [],
  );

  const connectAccount = useCallback(
    async (provider: string, email: string) => {
      const normalizedProvider = normalizeProvider(provider);

      if (SUPPORTED_PROVIDERS.every((entry) => entry !== normalizedProvider)) {
        throw new Error(`Unsupported provider: ${provider}.`);
      }

      if (email.trim().length === 0) {
        throw new Error('Connected accounts require an email address.');
      }

      if (
        connectedAccounts.some(
          (account) => normalizeProvider(account.provider) === normalizedProvider,
        )
      ) {
        throw new Error(`${provider} is already connected.`);
      }

      await Promise.resolve();

      setConnectedAccounts((current) => [
        ...current,
        {
          provider: normalizedProvider,
          email: email.trim(),
          connectedAt: nowIsoString(),
        },
      ]);
    },
    [connectedAccounts],
  );

  const disconnectAccount = useCallback(async (provider: string) => {
    const normalizedProvider = normalizeProvider(provider);
    await Promise.resolve();

    setConnectedAccounts((current) =>
      current.filter(
        (account) => normalizeProvider(account.provider) !== normalizedProvider,
      ),
    );
  }, []);

  const exportData = useCallback(async () => {
    await Promise.resolve();

    return JSON.stringify(
      {
        exportedAt: nowIsoString(),
        profile,
        security,
        sessions,
        notifications,
        connectedAccounts,
      },
      null,
      2,
    );
  }, [connectedAccounts, notifications, profile, security, sessions]);

  const deleteAccount = useCallback(
    async (input: DeleteAccountInput) => {
      if (input.confirmationText.trim() !== profile.displayName) {
        throw new Error('Type your account name exactly before deleting your account.');
      }

      await Promise.resolve();

      setConnectedAccounts([]);
      setNotifications({
        emailSales: false,
        emailCollaborations: false,
        emailUpdates: false,
        pushSales: false,
        pushCollaborations: false,
      });
      setSessions([]);
      setSecurity((current) => ({
        ...current,
        activeSessions: 0,
      }));
    },
    [profile.displayName],
  );

  const availableProviders = useMemo(
    () =>
      SUPPORTED_PROVIDERS.filter(
        (provider) =>
          !connectedAccounts.some(
            (account) => normalizeProvider(account.provider) === provider,
          ),
      ),
    [connectedAccounts],
  );

  return {
    profile,
    security,
    sessions,
    notifications,
    connectedAccounts,
    availableProviders,
    isLoading,
    updateProfile,
    changePassword,
    toggleTwoFactor,
    revokeSession,
    updateNotifications,
    connectAccount,
    disconnectAccount,
    exportData,
    deleteAccount,
  };
}
