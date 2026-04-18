/**
 * Purpose: Regression tests for the account settings page tab navigation.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/tabs
 * Tests:
 *   - packages/storefront/src/components/settings/SettingsPage.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  it('renders account settings tabs and switches between sections', async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /profile/i })).toBeInTheDocument();
    });

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('heading', { name: /profile information/i })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /security/i }));
    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /notifications/i }));
    expect(screen.getByRole('heading', { name: /notification preferences/i })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /danger zone/i }));
    expect(screen.getByRole('heading', { name: /danger zone/i })).toBeInTheDocument();
  });
});
