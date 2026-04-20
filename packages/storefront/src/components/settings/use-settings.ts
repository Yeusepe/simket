/**
 * Purpose: Manage Better Auth-backed account settings state for the storefront.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://www.better-auth.com/docs
 *   - https://www.better-auth.com/docs/plugins/generic-oauth
 * Tests:
 *   - packages/storefront/src/components/settings/use-settings.test.ts
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { getAuthBaseUrl } from '../../lib/auth-client';
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

const SUPPORTED_PROVIDERS = ['yucp-creators'] as const;

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  emailSales: true,
  emailCollaborations: true,
  emailUpdates: true,
  pushSales: false,
  pushCollaborations: false,
};

interface BetterAuthSessionRecord {
  readonly id: string;
  readonly token: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
  readonly userAgent?: string | null;
  readonly ipAddress?: string | null;
}

interface BetterAuthAccountRecord {
  readonly id: string;
  readonly providerId: string;
  readonly accountId: string;
  readonly createdAt: string;
}

interface BetterAuthResponse<TData> {
  readonly data?: TData;
  readonly error?: {
    readonly message?: string;
  };
}

function getNotificationStorageKey(userId: string): string {
  return `simket-notification-preferences:${userId}`;
}

function normalizeProvider(provider: string): string {
  return provider.trim().toLowerCase();
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function getAuthEndpoint(path: string): string {
  const baseUrl = getAuthBaseUrl();
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ''), normalizedBaseUrl).toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStoredNotificationPreferences(userId: string): NotificationPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_NOTIFICATIONS;
  }

  try {
    const rawValue = window.localStorage.getItem(getNotificationStorageKey(userId));
    if (!rawValue) {
      return DEFAULT_NOTIFICATIONS;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsedValue)) {
      return DEFAULT_NOTIFICATIONS;
    }

    return {
      emailSales: Boolean(parsedValue['emailSales']),
      emailCollaborations: Boolean(parsedValue['emailCollaborations']),
      emailUpdates: Boolean(parsedValue['emailUpdates']),
      pushSales: Boolean(parsedValue['pushSales']),
      pushCollaborations: Boolean(parsedValue['pushCollaborations']),
    };
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

function storeNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    getNotificationStorageKey(userId),
    JSON.stringify(preferences),
  );
}

async function callBetterAuth<TData>(
  path: string,
  init?: RequestInit,
): Promise<TData> {
  const response = await fetch(getAuthEndpoint(path), {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = (await response.json().catch(() => undefined)) as
    | BetterAuthResponse<TData>
    | TData
    | undefined;

  if (!response.ok) {
    const message = isRecord(payload) && isRecord(payload['error'])
      ? payload['error']['message']
      : undefined;
    throw new Error(
      typeof message === 'string' && message.length > 0
        ? message
        : `Better Auth request failed with status ${response.status}.`,
    );
  }

  if (isRecord(payload) && 'data' in payload && payload.data !== undefined) {
    return payload.data as TData;
  }

  return payload as TData;
}

function toSessionLabel(session: BetterAuthSessionRecord): string {
  if (session.userAgent && session.userAgent.length > 0) {
    return session.userAgent;
  }

  if (session.ipAddress && session.ipAddress.length > 0) {
    return `Session from ${session.ipAddress}`;
  }

  return 'Browser session';
}

function mapSecuritySessions(
  sessions: readonly BetterAuthSessionRecord[],
  currentSessionId?: string,
): readonly SecuritySession[] {
  return sessions.map((session) => ({
    id: session.id,
    label: session.id === currentSessionId ? 'Current browser' : toSessionLabel(session),
    lastActiveAt: session.updatedAt,
    isCurrent: session.id === currentSessionId,
  }));
}

function mapConnectedAccounts(
  accounts: readonly BetterAuthAccountRecord[],
  email: string,
): readonly ConnectedAccount[] {
  return accounts.map((account) => ({
    provider: account.providerId,
    email,
    connectedAt: account.createdAt,
  }));
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
    password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
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
  const { session, isPending, signOut } = useAuth();
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
  const [notifications, setNotifications] = useState<NotificationPreferences>(DEFAULT_NOTIFICATIONS);
  const [connectedAccounts, setConnectedAccounts] = useState<readonly ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setProfile({
        displayName: '',
        email: '',
        createdAt: '',
      });
      setSecurity({
        hasTwoFactor: false,
        activeSessions: 0,
      });
      setSessions([]);
      setNotifications(DEFAULT_NOTIFICATIONS);
      setConnectedAccounts([]);
      setIsLoading(isPending);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const initialProfile: UserProfile = {
      displayName: session.user.name,
      email: session.user.email,
      avatarUrl: session.user.image ?? undefined,
      bio: session.user.bio ?? undefined,
      website: session.user.website ?? undefined,
      createdAt: session.user.createdAt ?? '',
    };

    setProfile(initialProfile);
    setNotifications(readStoredNotificationPreferences(session.user.id));

    void Promise.all([
      callBetterAuth<readonly BetterAuthSessionRecord[]>('/list-sessions'),
      callBetterAuth<readonly BetterAuthAccountRecord[]>('/list-accounts'),
    ])
      .then(([nextSessions, nextAccounts]) => {
        if (cancelled) {
          return;
        }

        const mappedSessions = mapSecuritySessions(nextSessions, session.session.id);
        setSessions(mappedSessions);
        setSecurity({
          hasTwoFactor: false,
          activeSessions: mappedSessions.length,
        });
        setConnectedAccounts(mapConnectedAccounts(nextAccounts, session.user.email));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setSessions([
          {
            id: session.session.id,
            label: 'Current browser',
            lastActiveAt: nowIsoString(),
            isCurrent: true,
          },
        ]);
        setSecurity({
          hasTwoFactor: false,
          activeSessions: 1,
        });
        setConnectedAccounts([]);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isPending, session]);

  const updateProfile = useCallback(async (nextProfile: ProfileUpdateInput) => {
    if (!session) {
      throw new Error('You must be signed in to update your profile.');
    }

    const displayNameError = validateDisplayName(nextProfile.displayName);
    if (displayNameError) {
      throw new Error(displayNameError);
    }

    const websiteError = validateWebsiteUrl(nextProfile.website ?? '');
    if (websiteError) {
      throw new Error(websiteError);
    }

    await callBetterAuth<{ readonly status: boolean }>('/update-user', {
      method: 'POST',
      body: JSON.stringify({
        name: nextProfile.displayName.trim(),
        image: nextProfile.avatarUrl?.trim() || null,
        bio: nextProfile.bio?.trim() || null,
        website: nextProfile.website?.trim() || null,
      }),
    });

    setProfile((current) => ({
      ...current,
      displayName: nextProfile.displayName.trim(),
      avatarUrl: nextProfile.avatarUrl?.trim() || undefined,
      bio: nextProfile.bio?.trim() || undefined,
      website: nextProfile.website?.trim() || undefined,
    }));
  }, [session]);

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

    await callBetterAuth('/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: false,
      }),
    });

    setSecurity((current) => ({
      ...current,
      lastPasswordChange: nowIsoString(),
    }));
  }, []);

  const toggleTwoFactor = useCallback(async (isEnabled: boolean) => {
    if (isEnabled) {
      throw new Error('Two-factor authentication is not configured for this environment yet.');
    }

    setSecurity((current) => ({
      ...current,
      hasTwoFactor: false,
    }));
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    const targetSession = sessions.find((entry) => entry.id === sessionId);
    if (!targetSession) {
      return;
    }

    const activeSession = await callBetterAuth<readonly BetterAuthSessionRecord[]>('/list-sessions');
    const matchingSession = activeSession.find((entry) => entry.id === sessionId);
    if (!matchingSession) {
      setSessions((currentSessions) => currentSessions.filter((entry) => entry.id !== sessionId));
      setSecurity((currentSecurity) => ({
        ...currentSecurity,
        activeSessions: Math.max(0, currentSecurity.activeSessions - 1),
      }));
      return;
    }

    await callBetterAuth('/revoke-session', {
      method: 'POST',
      body: JSON.stringify({ token: matchingSession.token }),
    });

    setSessions((currentSessions) => {
      const nextSessions = currentSessions.filter((entry) => entry.id !== sessionId);
      setSecurity((currentSecurity) => ({
        ...currentSecurity,
        activeSessions: nextSessions.length,
      }));
      return nextSessions;
    });

    if (matchingSession.id === session?.session.id) {
      await signOut();
    }
  }, [session?.session.id, sessions, signOut]);

  const updateNotifications = useCallback(async (
    nextPreferences: Partial<NotificationPreferences>,
  ) => {
    if (!session) {
      throw new Error('You must be signed in to update notifications.');
    }

    setNotifications((current) => {
      const updated = {
        ...current,
        ...nextPreferences,
      };
      storeNotificationPreferences(session.user.id, updated);
      return updated;
    });
  }, [session]);

  const connectAccount = useCallback(async (provider: string) => {
    const normalizedProvider = normalizeProvider(provider);
    if (SUPPORTED_PROVIDERS.every((entry) => entry !== normalizedProvider)) {
      throw new Error(`Unsupported provider: ${provider}.`);
    }

    const response = await callBetterAuth<{ readonly url: string }>('/oauth2/link', {
      method: 'POST',
      body: JSON.stringify({
        providerId: normalizedProvider,
        callbackURL: `${window.location.origin}/profile`,
        errorCallbackURL: `${window.location.origin}/profile`,
      }),
    });

    window.location.assign(response.url);
  }, []);

  const disconnectAccount = useCallback(async (provider: string) => {
    const normalizedProvider = normalizeProvider(provider);
    const account = connectedAccounts.find(
      (entry) => normalizeProvider(entry.provider) === normalizedProvider,
    );

    if (!account) {
      return;
    }

    await callBetterAuth('/unlink-account', {
      method: 'POST',
      body: JSON.stringify({
        providerId: normalizedProvider,
      }),
    });

    setConnectedAccounts((current) =>
      current.filter((entry) => normalizeProvider(entry.provider) !== normalizedProvider),
    );
  }, [connectedAccounts]);

  const exportData = useCallback(async () => JSON.stringify(
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
  ), [connectedAccounts, notifications, profile, security, sessions]);

  const deleteAccount = useCallback(async (input: DeleteAccountInput) => {
    if (input.confirmationText.trim() !== profile.displayName) {
      throw new Error('Type your account name exactly before deleting your account.');
    }

    await callBetterAuth<{ readonly success: boolean; readonly message: string }>('/delete-user', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }, [profile.displayName]);

  const availableProviders = useMemo(
    () => SUPPORTED_PROVIDERS.filter(
      (provider) => !connectedAccounts.some(
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
