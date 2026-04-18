/**
 * Purpose: Regression tests for destructive account settings actions and export flow.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/modal
 * Tests:
 *   - packages/storefront/src/components/settings/DangerZone.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DangerZone } from './DangerZone';

describe('DangerZone', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports account data as a downloadable file', async () => {
    const user = userEvent.setup();
    const onExportData = vi.fn().mockResolvedValue('{"displayName":"Creator Name"}');
    const click = vi.fn();
    const remove = vi.fn();
    const originalCreateElement = document.createElement.bind(document);

    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:settings-export'),
        revokeObjectURL: vi.fn(),
      }),
    );
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return {
          click,
          remove,
          set href(_: string) {},
          set download(_: string) {},
        } as unknown as HTMLAnchorElement;
      }

      return originalCreateElement(tagName);
    });

    render(
      <DangerZone
        accountName="Creator Name"
        onExportData={onExportData}
        onDeleteAccount={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /export account data/i }));

    await waitFor(() => {
      expect(onExportData).toHaveBeenCalledOnce();
      expect(URL.createObjectURL).toHaveBeenCalledOnce();
      expect(click).toHaveBeenCalledOnce();
      expect(remove).toHaveBeenCalledOnce();
      expect(URL.revokeObjectURL).toHaveBeenCalledOnce();
    });
  });

  it('requires the account name before allowing account deletion', async () => {
    const user = userEvent.setup();
    const onDeleteAccount = vi.fn().mockResolvedValue(undefined);

    render(
      <DangerZone
        accountName="Creator Name"
        onExportData={vi.fn()}
        onDeleteAccount={onDeleteAccount}
      />,
    );

    await user.click(screen.getByRole('button', { name: /delete account/i }));

    expect(await screen.findByRole('dialog', { name: /delete account/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/type creator name to confirm/i), 'Wrong Name');
    await user.click(screen.getByRole('button', { name: /permanently delete account/i }));

    expect(onDeleteAccount).not.toHaveBeenCalled();
    expect(await screen.findByText(/type your account name exactly/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/type creator name to confirm/i));
    await user.type(screen.getByLabelText(/type creator name to confirm/i), 'Creator Name');
    await user.click(screen.getByRole('button', { name: /permanently delete account/i }));

    await waitFor(() => {
      expect(onDeleteAccount).toHaveBeenCalledWith('Creator Name');
    });
  });
});
