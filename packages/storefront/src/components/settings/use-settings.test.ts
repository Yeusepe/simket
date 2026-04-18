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
import { describe, expect, it } from 'vitest';
import {
  isStrongPassword,
  useSettings,
  validateDisplayName,
  validatePassword,
  validateWebsiteUrl,
} from './use-settings';

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
      await result.current.toggleTwoFactor(true);
      await result.current.updateNotifications({
        emailUpdates: false,
        pushSales: true,
      });
      await result.current.connectAccount('google', 'creator@gmail.com');
      await result.current.disconnectAccount('github');
    });

    expect(result.current.security.hasTwoFactor).toBe(true);
    expect(result.current.notifications.emailUpdates).toBe(false);
    expect(result.current.notifications.pushSales).toBe(true);
    expect(result.current.connectedAccounts.some((account) => account.provider === 'google')).toBe(true);
    expect(result.current.connectedAccounts.some((account) => account.provider === 'github')).toBe(false);

    let exportedData = '';
    await act(async () => {
      exportedData = await result.current.exportData();
    });

    expect(exportedData).toContain('Updated Creator');
    expect(exportedData).toContain('"provider": "google"');
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
