/**
 * Purpose: Verify experiment result tables, conversion summaries, and significance messaging.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 * External references:
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/table
 * Tests:
 *   - packages/storefront/src/components/experiments/ExperimentResults.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExperimentResults } from './ExperimentResults';

describe('ExperimentResults', () => {
  it('renders per-variant metrics and low-sample significance guidance', () => {
    render(
      <ExperimentResults
        results={[
          {
            variantName: 'control',
            impressions: 18,
            clicks: 6,
            purchases: 2,
            conversionRate: 11.1,
          },
          {
            variantName: 'variant-b',
            impressions: 14,
            clicks: 4,
            purchases: 1,
            conversionRate: 7.1,
          },
        ]}
      />,
    );

    expect(screen.getByText('control')).toBeInTheDocument();
    expect(screen.getByText('variant-b')).toBeInTheDocument();
    expect(screen.getByText('11.1%')).toBeInTheDocument();
    expect(screen.getByText(/needs more data/i)).toBeInTheDocument();
  });
});
