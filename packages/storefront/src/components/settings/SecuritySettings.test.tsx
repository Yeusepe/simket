/**
 * Purpose: Regression tests for account security actions including password updates, 2FA, and sessions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/switch
 * Tests:
 *   - packages/storefront/src/components/settings/SecuritySettings.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SecuritySettings } from './SecuritySettings';
import type { SecurityInfo, SecuritySession } from './settings-types';

const TEST_SECURITY: SecurityInfo = {
  hasTwoFactor: false,
  activeSessions: 2,
  lastPasswordChange: '2025-02-01T00:00:00.000Z',
};

const TEST_SESSIONS: readonly SecuritySession[] = [
  {
    id: 'session-current',
    label: 'Current browser',
    lastActiveAt: '2025-03-01T12:00:00.000Z',
    isCurrent: true,
  },
  {
    id: 'session-mobile',
    label: 'iPhone 15 Pro',
    lastActiveAt: '2025-03-01T10:00:00.000Z',
    isCurrent: false,
  },
];

describe('SecuritySettings', () => {
  it('renders password controls, 2FA toggle, and sessions', () => {
    render(
      <SecuritySettings
        accountName="Creator Name"
        security={TEST_SECURITY}
        sessions={TEST_SESSIONS}
        onChangePassword={vi.fn()}
        onToggleTwoFactor={vi.fn()}
        onRevokeSession={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /two-factor authentication/i })).toBeInTheDocument();
    expect(screen.getByText(/current browser/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revoke iphone 15 pro/i })).toBeInTheDocument();
  });

  it('submits password changes, toggles 2FA, and revokes sessions', async () => {
    const user = userEvent.setup();
    const onChangePassword = vi.fn().mockResolvedValue(undefined);
    const onToggleTwoFactor = vi.fn().mockResolvedValue(undefined);
    const onRevokeSession = vi.fn().mockResolvedValue(undefined);

    render(
      <SecuritySettings
        accountName="Creator Name"
        security={TEST_SECURITY}
        sessions={TEST_SESSIONS}
        onChangePassword={onChangePassword}
        onToggleTwoFactor={onToggleTwoFactor}
        onRevokeSession={onRevokeSession}
      />,
    );

    await user.type(screen.getByLabelText(/current password/i), 'CurrentPass1');
    await user.type(screen.getByLabelText(/^new password$/i), 'StrongerPass2');
    await user.type(screen.getByLabelText(/confirm new password/i), 'StrongerPass2');
    await user.click(screen.getByRole('button', { name: /update password/i }));
    await user.click(screen.getByRole('switch', { name: /two-factor authentication/i }));
    await user.click(screen.getByRole('button', { name: /revoke iphone 15 pro/i }));

    expect(onChangePassword).toHaveBeenCalledWith({
      currentPassword: 'CurrentPass1',
      newPassword: 'StrongerPass2',
      confirmPassword: 'StrongerPass2',
    });
    expect(onToggleTwoFactor).toHaveBeenCalledWith(true);
    expect(onRevokeSession).toHaveBeenCalledWith('session-mobile');
  });
});
