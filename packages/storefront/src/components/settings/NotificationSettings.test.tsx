/**
 * Purpose: Regression tests for account notification preference controls.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/switch
 * Tests:
 *   - packages/storefront/src/components/settings/NotificationSettings.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NotificationSettings } from './NotificationSettings';
import type { NotificationPreferences } from './settings-types';

const TEST_PREFERENCES: NotificationPreferences = {
  emailSales: true,
  emailCollaborations: true,
  emailUpdates: true,
  pushSales: false,
  pushCollaborations: false,
};

describe('NotificationSettings', () => {
  it('renders toggles and persists updated preferences', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <NotificationSettings
        preferences={TEST_PREFERENCES}
        onSave={onSave}
      />,
    );

    const pushSalesToggle = screen.getByRole('switch', { name: /push sales/i });

    await user.click(pushSalesToggle);

    expect(screen.getByText(/get browser push alerts for new sales\. enabled\./i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save notifications/i }));

    expect(onSave).toHaveBeenCalledWith({
      emailSales: true,
      emailCollaborations: true,
      emailUpdates: true,
      pushSales: true,
        pushCollaborations: false,
      });
  });
});
