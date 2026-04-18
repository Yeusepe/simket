/**
 * Purpose: Regression tests for creator analytics time range selection controls.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/button-group
 * Tests:
 *   - packages/storefront/src/components/dashboard/analytics/TimeRangeFilter.test.tsx
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TimeRangeFilter } from './TimeRangeFilter';

describe('TimeRangeFilter', () => {
  it('renders every supported time range option', () => {
    render(<TimeRangeFilter value="30d" onChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 90 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last year' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All time' })).toBeInTheDocument();
  });

  it('calls onChange when a new range is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TimeRangeFilter value="30d" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Last 90 days' }));

    expect(onChange).toHaveBeenCalledWith('90d');
  });
});
