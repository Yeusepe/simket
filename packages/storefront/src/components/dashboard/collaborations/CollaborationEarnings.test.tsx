/**
 * Purpose: Verify collaboration earnings charts render populated and empty states accessibly.
 * Governing docs:
 *   - docs/architecture.md (§7 HeroUI everywhere)
 *   - docs/service-architecture.md (§2.4 collaboration settlement admin queries)
 *   - docs/domain-model.md (§4.4.1 Settlement)
 * External references:
 *   - https://recharts.github.io/
 * Tests:
 *   - packages/storefront/src/components/dashboard/collaborations/CollaborationEarnings.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CollaborationEarnings } from './CollaborationEarnings';

describe('CollaborationEarnings', () => {
  it('renders chart output for a populated earnings history', () => {
    render(
      <CollaborationEarnings
        history={[
          { period: 'Mar 1', earnedCents: 12000, pendingCents: 800 },
          { period: 'Mar 8', earnedCents: 15600, pendingCents: 1200 },
        ]}
      />,
    );

    expect(screen.getByText('Earnings breakdown')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Collaboration earnings breakdown chart' })).toBeInTheDocument();
  });

  it('renders an empty state when no earnings history exists', () => {
    render(<CollaborationEarnings history={[]} />);

    expect(screen.getByText('No earnings have been recorded for this collaboration yet.')).toBeInTheDocument();
  });
});
