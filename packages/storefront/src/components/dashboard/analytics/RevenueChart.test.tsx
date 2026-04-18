/**
 * Purpose: Regression tests for creator revenue chart rendering and empty-state behavior.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://recharts.github.io/
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/RevenueChart.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RevenueChart } from './RevenueChart';

describe('RevenueChart', () => {
  it('renders revenue chart content for a populated series', () => {
    render(
      <RevenueChart
        points={[
          { date: '2025-03-01', value: 12000 },
          { date: '2025-03-02', value: 9000 },
          { date: '2025-03-03', value: 16000 },
        ]}
      />,
    );

    expect(screen.getByText('Revenue over time')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Revenue over time chart' })).toBeInTheDocument();
  });

  it('renders an empty state when no revenue data is available', () => {
    render(<RevenueChart points={[]} />);

    expect(screen.getByText('No revenue data for this range.')).toBeInTheDocument();
  });
});
