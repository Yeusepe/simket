/**
 * Purpose: Verify the route-level collaborations page wires invitation actions into the dashboard view.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere, §5 service ownership)
 *   - docs/service-architecture.md (§1.1 Vendure gateway, §2.4 collaboration settlement admin queries)
 *   - docs/domain-model.md (§4.4 Collaboration, §4.4.1 CollaborationInvitation)
 * External references:
 *   - https://heroui.com/docs/react/components/tabs.mdx
 * Tests:
 *   - packages/storefront/src/pages/dashboard/DashboardCollaborationsPage.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DashboardCollaborationsPage } from './DashboardCollaborationsPage';

describe('DashboardCollaborationsPage', () => {
  it('moves an accepted incoming invitation into the active tab', async () => {
    const user = userEvent.setup();

    render(<DashboardCollaborationsPage />);

    await user.click(screen.getByRole('tab', { name: 'Pending Invitations (2)' }));
    await user.click(screen.getByRole('button', { name: 'Accept invitation' }));

    expect(screen.queryByText('Stylized Forest Pack')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Active (3)' }));

    expect(screen.getByText('Stylized Forest Pack')).toBeInTheDocument();
  });
});
