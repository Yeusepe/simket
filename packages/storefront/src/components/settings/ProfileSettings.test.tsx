/**
 * Purpose: Regression tests for the account profile settings editor.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/input
 *   - https://www.heroui.com/docs/react/components/textarea
 * Tests:
 *   - packages/storefront/src/components/settings/ProfileSettings.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfileSettings } from './ProfileSettings';
import type { UserProfile } from './settings-types';

const TEST_PROFILE: UserProfile = {
  displayName: 'Creator Name',
  email: 'creator@example.com',
  avatarUrl: 'https://cdn.example.com/avatar.png',
  bio: 'Original bio',
  website: 'https://example.com',
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('ProfileSettings', () => {
  it('renders the editable profile form and validates invalid input', async () => {
    const user = userEvent.setup();

    render(<ProfileSettings profile={TEST_PROFILE} onSave={vi.fn()} />);

    expect(screen.getByLabelText(/display name/i)).toHaveValue('Creator Name');
    expect(screen.getByLabelText(/email address/i)).toHaveValue('creator@example.com');
    expect(screen.getByLabelText(/avatar upload/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/display name/i));
    await user.type(screen.getByLabelText(/display name/i), 'A');
    await user.clear(screen.getByLabelText(/website/i));
    await user.type(screen.getByLabelText(/website/i), 'notaurl');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(await screen.findByText(/display name must be at least 2 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/valid http or https url/i)).toBeInTheDocument();
  });

  it('submits a valid profile update', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<ProfileSettings profile={TEST_PROFILE} onSave={onSave} />);

    await user.clear(screen.getByLabelText(/display name/i));
    await user.type(screen.getByLabelText(/display name/i), 'Updated Creator');
    await user.clear(screen.getByLabelText(/bio/i));
    await user.type(screen.getByLabelText(/bio/i), 'New bio copy');
    await user.clear(screen.getByLabelText(/website/i));
    await user.type(screen.getByLabelText(/website/i), 'https://simket.dev');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'Updated Creator',
        bio: 'New bio copy',
        website: 'https://simket.dev',
      }),
    );
  });
});
