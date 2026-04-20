/**
 * Purpose: Regression tests for account settings validators and client-side state transitions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://react.dev/reference/react/useEffect
 *   - https://www.better-auth.com/docs
 * Tests:
 *   - packages/storefront/src/components/settings/use-settings.test.ts
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isStrongPassword,
  useSettings,
  validateDisplayName,
  validatePassword,
  validateWebsiteUrl,
} from './use-settings';

const mockAssign = vi.fn();
const mockFetch = vi.fn();
const mockAuthContext = {
  session: {
    user: {
      id: 'user-1',
      email: 'creator@simket.test',
      name: 'Simket Creator',
      role: 'creator',
      bio: 'Making storefront-ready digital goods.',
      website: 'https://simket.dev',
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    session: {
      id: 'session-current',
    },
  },
  isPending: false,
  signOut: vi.fn(async () => {}),
};

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => mockAuthContext,
}));

beforeEach(() => {
  mockAssign.mockReset();
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      origin: 'http://localhost:5173',
      assign: mockAssign,
    },
  });

  mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith('/list-sessions')) {
      return new Response(JSON.stringify([
        {
          id: 'session-current',
          token: 'token-current',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-03-10T12:00:00.000Z',
          expiresAt: '2025-04-10T12:00:00.000Z',
          userAgent: 'Current browser',
        },
        {
          id: 'session-mobile',
          token: 'token-mobile',
          createdAt: '2025-01-02T00:00:00.000Z',
          updatedAt: '2025-03-10T09:15:00.000Z',
          expiresAt: '2025-04-10T09:15:00.000Z',
          userAgent: 'iPhone 15 Pro',
        },
      ]));
    }

    if (url.endsWith('/list-accounts')) {
      return new Response(JSON.stringify([
        {
          id: 'account-yucp',
          providerId: 'yucp-creators',
          accountId: 'creator-1',
          createdAt: '2025-01-10T09:00:00.000Z',
        },
      ]));
    }

    if (url.endsWith('/oauth2/link')) {
      return new Response(JSON.stringify({ url: 'https://api.creators.yucp.club/oauth/authorize' }));
    }

    if (url.endsWith('/unlink-account')) {
      return new Response(JSON.stringify({ status: true }));
    }

    if (url.endsWith('/change-password')) {
      return new Response(JSON.stringify({ token: null, user: { id: 'user-1' } }));
    }

    if (url.endsWith('/update-user')) {
      return new Response(JSON.stringify({ status: true }));
    }

    if (url.endsWith('/revoke-session')) {
      return new Response(JSON.stringify({ status: true }));
    }

    if (url.endsWith('/delete-user')) {
      return new Response(JSON.stringify({ success: true, message: 'queued' }));
    }

    return new Response('{}');
  });
});

describe('settings validators', () => {
  it('validates display name length', () => {
    expect(validateDisplayName('A')).toMatch(/at least 2 characters/i);
    expect(validateDisplayName('Valid Creator')).toBeUndefined();
    expect(validateDisplayName('x'.repeat(51))).toMatch(/50 characters or fewer/i);
  });

  it('validates strong passwords', () => {
    expect(isStrongPassword('weakpass')).toBe(false);
    expect(validatePassword('weakpass')).toMatch(/uppercase/i);
    expect(validatePassword('StrongPass1')).toBeUndefined();
  });

  it('validates website URLs', () => {
    expect(validateWebsiteUrl('')).toBeUndefined();
    expect(validateWebsiteUrl('notaurl')).toMatch(/valid http or https url/i);
    expect(validateWebsiteUrl('https://simket.dev/settings')).toBeUndefined();
  });
});

describe('useSettings', () => {
  it('loads settings data and updates each domain slice', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile.displayName).toBe('Simket Creator');
    expect(result.current.connectedAccounts).toHaveLength(1);

    await act(async () => {
      await result.current.updateProfile({
        displayName: 'Updated Creator',
        bio: 'Shipping digital goods.',
        website: 'https://simket.dev',
      });
    });

    expect(result.current.profile.displayName).toBe('Updated Creator');
    expect(result.current.profile.website).toBe('https://simket.dev');

    await act(async () => {
      await result.current.changePassword({
        currentPassword: 'CurrentPass1',
        newPassword: 'StrongerPass2',
        confirmPassword: 'StrongerPass2',
      });
    });

    expect(result.current.security.lastPasswordChange).toBeDefined();

    await act(async () => {
      await result.current.updateNotifications({
        emailUpdates: false,
        pushSales: true,
      });
      await result.current.connectAccount('yucp-creators', 'creator@gmail.com');
      await result.current.disconnectAccount('yucp-creators');
    });

    expect(mockAssign).toHaveBeenCalledWith('https://api.creators.yucp.club/oauth/authorize');
    expect(result.current.notifications.emailUpdates).toBe(false);
    expect(result.current.notifications.pushSales).toBe(true);
    expect(result.current.connectedAccounts).toHaveLength(0);

    let exportedData = '';
    await act(async () => {
      exportedData = await result.current.exportData();
    });

    expect(exportedData).toContain('Updated Creator');
    expect(exportedData).toContain('"emailUpdates": false');
  });

  it('rejects account deletion when the confirmation text does not match', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      result.current.deleteAccount({
        confirmationText: 'wrong name',
      }),
    ).rejects.toThrow(/type your account name exactly/i);
  });
});
