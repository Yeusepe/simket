/**
 * Purpose: Regression tests for the recent dashboard activity feed.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/dashboard/RecentActivity.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecentActivity } from './RecentActivity';

describe('RecentActivity', () => {
  it('renders activity items', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-01T12:00:00.000Z'));

    render(
      <RecentActivity
        items={[
          {
            id: 'sale-1',
            type: 'sale',
            title: 'New sale',
            description: 'Starter Pack was purchased.',
            timestamp: '2025-02-01T11:00:00.000Z',
          },
          {
            id: 'review-1',
            type: 'review',
            title: 'New review',
            description: 'A buyer left a five star review.',
            timestamp: '2025-02-01T10:30:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('New sale')).toBeInTheDocument();
    expect(screen.getByText('Starter Pack was purchased.')).toBeInTheDocument();
    expect(screen.getAllByText('1 hour ago')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'View all activity' })).toHaveAttribute('href', '/dashboard/activity');

    vi.useRealTimers();
  });

  it('renders an empty state when there is no activity', () => {
    render(<RecentActivity items={[]} />);

    expect(screen.getByText('No recent activity yet.')).toBeInTheDocument();
  });
});
